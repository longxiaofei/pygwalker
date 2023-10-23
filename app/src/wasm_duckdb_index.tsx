import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { observer } from "mobx-react-lite";
import { GraphicWalker } from '@kanaries/graphic-walker'
import type { IGlobalStore } from '@kanaries/graphic-walker/dist/store'
import type { IStoInfo } from '@kanaries/graphic-walker/dist/utils/save';
import { IDataSetInfo, IMutField, IRow, IGWHandler, IDataQueryPayload } from '@kanaries/graphic-walker/dist/interfaces';
import { parser_dsl_with_table } from "@kanaries-temp/gw-dsl-parser";
import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';

import Options from './components/options';
import { IAppProps } from './interfaces';
import { setConfig } from './utils/userConfig';


const initDuckdb = async(props: IAppProps) => {
    const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
        mvp: {
            mainModule: duckdb_wasm,
            mainWorker: mvp_worker,
        },
        eh: {
            mainModule: duckdb_wasm_eh,
            mainWorker: eh_worker,
        },
    };
    // Select a bundle based on browser checks
    const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
    // Instantiate the asynchronus version of DuckDB-wasm
    const worker = new Worker(bundle.mainWorker!);
    const logger = new duckdb.ConsoleLogger();
    const db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    let binaryString = atob(props.parquetData);
    let bytes = new Uint8Array(binaryString.length);
    for (var i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    await db.registerFileBuffer("data.parquet", bytes);
    const conn = await db.connect();
    try {
        await conn.query(`CREATE TABLE pygwalker_mid_table AS SELECT * FROM "data.parquet"`);
    } finally {
        await conn.close();
    }
    return db;
}

const App: React.FC<IAppProps, > = observer((propsIn) => {
    const storeRef = React.useRef<IGlobalStore|null>(null);
    const gwRef = React.useRef<IGWHandler|null>(null);
    const { dataSource, ...props } = propsIn;
    const { rawFields, userConfig } = props;
    const [ db, setDb ] = useState<duckdb.AsyncDuckDB | null>(null);
    const specList = props.visSpec ? JSON.parse(props.visSpec) : [];

    const setData = (data?: IRow[], rawFields?: IMutField[]) => {
        if (specList.length !== 0) {
            setTimeout(() => {
                storeRef?.current?.vizStore?.importStoInfo({
                    dataSources: [{
                        id: 'dataSource-0',
                        data: data,
                    }],
                    datasets: [{
                        id: 'dataset-0',
                        name: 'DataSet', rawFields: rawFields, dsId: 'dataSource-0',
                    }],
                    specList,
                } as IStoInfo);
            }, 0);
        } else {
            storeRef?.current?.commonStore?.updateTempSTDDS({
                name: 'Dataset',
                rawFields: rawFields,
                dataSource: data,
            } as IDataSetInfo);
            storeRef?.current?.commonStore?.commitTempDS();
        }
    }

    useEffect(() => {
        setData(dataSource, rawFields);
        if (userConfig) setConfig(userConfig);
        initDuckdb(props).then(db => {
            setDb(db);
        })
    }, []);

    const computationCallback = useCallback(async (payload: IDataQueryPayload) => {
        const sql = parser_dsl_with_table(
            "pygwalker_mid_table",
            JSON.stringify(payload)
        );
        const conn = await db!.connect();
        try {
            const result = await conn.query(sql);
            return result.toArray().map((row) => row.toJSON()) as IRow[];
        } finally {
            await conn.close();
        }
    }, [db]);
  
    return (
        <React.StrictMode>
            db && <GraphicWalker {...props} storeRef={storeRef} ref={gwRef} computation={computationCallback} />
            <Options {...props} />
        </React.StrictMode>
    );
})


function GWalker(props: IAppProps, id: string) {
    ReactDOM.render(
        <App {...props} /> ,
        document.getElementById(id)
    );
}

export default { GWalker }
