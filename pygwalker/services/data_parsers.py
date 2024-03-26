import sys
from typing import Dict, Optional, Union, Any, List, Tuple

import duckdb
import sqlglot

from pygwalker.utils.payload_to_sql import get_sql_from_payload
from pygwalker.data_parsers.base import BaseDataParser, FieldSpec
from pygwalker.data_parsers.database_parser import Connector
from pygwalker._typing import DataFrame

__classname2method = {}


# pylint: disable=import-outside-toplevel
def _get_data_parser(dataset: Union[DataFrame, Connector, str]) -> BaseDataParser:
    """
    Get DataFrameDataParser for dataset
    TODO: Maybe you can find a better way to handle the following code
    """
    if type(dataset) in __classname2method:
        return __classname2method[type(dataset)]

    if 'pandas' in sys.modules:
        import pandas as pd
        if isinstance(dataset, pd.DataFrame):
            from pygwalker.data_parsers.pandas_parser import PandasDataFrameDataParser
            __classname2method[pd.DataFrame] = PandasDataFrameDataParser
            return __classname2method[pd.DataFrame]

    if 'polars' in sys.modules:
        import polars as pl
        if isinstance(dataset, pl.DataFrame):
            from pygwalker.data_parsers.polars_parser import PolarsDataFrameDataParser
            __classname2method[pl.DataFrame] = PolarsDataFrameDataParser
            return __classname2method[pl.DataFrame]

    if 'modin.pandas' in sys.modules:
        from modin import pandas as mpd
        if isinstance(dataset, mpd.DataFrame):
            from pygwalker.data_parsers.modin_parser import ModinPandasDataFrameDataParser
            __classname2method[mpd.DataFrame] = ModinPandasDataFrameDataParser
            return __classname2method[mpd.DataFrame]

    if 'pyspark' in sys.modules:
        from pyspark.sql import DataFrame as SparkDataFrame
        if isinstance(dataset, SparkDataFrame):
            from pygwalker.data_parsers.spark_parser import SparkDataFrameDataParser
            __classname2method[SparkDataFrame] = SparkDataFrameDataParser
            return __classname2method[SparkDataFrame]

    if isinstance(dataset, Connector):
        from pygwalker.data_parsers.database_parser import DatabaseDataParser
        __classname2method[DatabaseDataParser] = DatabaseDataParser
        return __classname2method[DatabaseDataParser]

    if isinstance(dataset, str):
        from pygwalker.data_parsers.cloud_dataset_parser import CloudDatasetParser
        __classname2method[CloudDatasetParser] = CloudDatasetParser
        return __classname2method[CloudDatasetParser]

    raise TypeError(f"Unsupported data type: {type(dataset)}")


def get_parser(
    dataset: Union[DataFrame, Connector, str],
    field_specs: Optional[List[FieldSpec]] = None,
    infer_string_to_date: bool = False,
    infer_number_to_dimension: bool = True,
    other_params: Optional[Dict[str, Any]] = None
) -> BaseDataParser:
    if field_specs is None:
        field_specs = []
    if other_params is None:
        other_params = {}

    parser = _get_data_parser(dataset)(
        dataset,
        field_specs,
        infer_string_to_date,
        infer_number_to_dimension,
        other_params
    )
    return parser


class MultiDatasetParser:
    """Multi dataset parser"""
    def __init__(self, parsers: List[Tuple[str, BaseDataParser]]):
        self._parsers = parsers
        self._parser_list = [parser for _, parser in parsers]
        self._parser_map = dict(parsers)

    @property
    def data_size(self) -> int:
        return sum(parser.data_size for parser in self._parser_list)

    def to_records(self, limit: Optional[int] = None) -> Dict[str, List[Dict[str, Any]]]:
        return {name: parser.to_records(limit) for name, parser in self._parsers}

    @property
    def raw_fields(self) -> List[Dict[str, str]]:
        raw_fields = []
        for name, parser in self._parsers:
            raw_fields.extend([{**field, "dataset": name} for field in parser.raw_fields])
        return raw_fields

    @property
    def dataset_tpye(self) -> str:
        return self._parser_list[0].dataset_tpye

    def get_datas_by_sql(self, sql: str) -> List[Dict[str, Any]]:
        query_function_map = {
            "pandas_dataframe": self._query_by_duckdb,
            "modin_dataframe": self._query_by_duckdb,
            "polars_dataframe": self._query_by_duckdb,
            "spark_dataframe": self._query_by_spark,
            "cloud_dataset":  
        }

    def get_datas_by_payload(self, payload: Dict[str, Any]) -> List[Dict[str, Any]]:
        sql = get_sql_from_payload(
            "pygwalker_view",
            payload,
            {name: parser.field_metas for name, parser in self._parsers}
        )
        return self.get_datas_by_sql(sql)

    def batch_get_datas_by_sql(self, sql_list: List[str]) -> List[List[Dict[str, Any]]]:
        """batch get records"""
        return [
            self.get_datas_by_sql(sql)
            for sql in sql_list
        ]

    def batch_get_datas_by_payload(self, payload_list: List[Dict[str, Any]]) -> List[List[Dict[str, Any]]]:
        """batch get records"""
        return [
            self.get_datas_by_payload(payload)
            for payload in payload_list
        ]

    def _query_by_duckdb(self, sql: str) -> List[Dict[str, Any]]:
        """query by duckdb"""
        try:
            duckdb.query("SET TimeZone = 'UTC'")
        except Exception:
            pass

        for name, parser in self._parsers:
            duckdb.register(name, parser._duckdb_df)

        result = duckdb.query(sql)
        return [
            dict(zip(result.columns, row))
            for row in result.fetchall()
        ]

    def _query_by_spark(self, sql: str) -> List[Dict[str, Any]]:
        """query by spark"""
        for name, parser in self._parsers:
            parser.df.createOrReplaceTempView(name)
        sql = sqlglot.transpile(sql, read="duckdb", write="spark")[0]
        result_df = self._parser_list[0].spark.sql(sql)
        return [row.asDict() for row in result_df.collect()]
    
    def _query_by_cloud(self, sql: str) -> List[Dict[str, Any]]:
        raise NotImplementedError("Not implemented yet")
    
    def _query_by_database(self, sql: str) -> List[Dict[str, Any]]:
        raise NotImplementedError("Not implemented yet")
