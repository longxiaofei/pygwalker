from typing import List, Dict, Any
from datetime import datetime
import io
import json

from typing_extensions import Literal
import requests

from .global_var import GlobalVarManager
from pygwalker.errors import CloudFunctionError
from pygwalker.utils.randoms import rand_str


class PrivateSession(requests.Session):
    """A session with kanaries"""
    def prepare_request(self, request: requests.Request) -> requests.PreparedRequest:
        req = super().prepare_request(request)
        req.headers["kanaries-api-key"] = GlobalVarManager.kanaries_api_key
        return req

    def send(self, request: requests.Request, **kwargs) -> requests.Response:
        resp = super().send(request, **kwargs)
        try:
            resp_json = resp.json()
        except Exception as e:
            raise CloudFunctionError(f"Request failed: {resp.text}") from e
        if resp_json["success"] is False:
            raise CloudFunctionError(f"Request failed: {resp_json['message']}")
        return resp


session = PrivateSession()


def _upload_dataset_meta(name: str, file_type: Literal["csv", "parquet"]) -> Dict[str, Any]:
    url = f"{GlobalVarManager.kanaries_api_host}/dataset/upload"

    if file_type == "csv":
        meta = {
            "extractHeader": True,
            "encoding": "utf-8",
            "type": "TEXT_FILE",
            "separator": ",",
        }
    else:
        meta = {
            "type": "PARQUET",
        }

    params = {
        "name": name,
        "fileName": name + f".{file_type}",
        "isPublic": True,
        "desc": "",
        "meta": meta
    }
    resp = session.post(url, json=params, timeout=10)
    return resp.json()["data"]


def _upload_dataset_callback(dataset_id: str, fid_list: List[str]) -> Dict[str, Any]:
    url = f"{GlobalVarManager.kanaries_api_host}/dataset/callback"
    params = {
        "datasetId": dataset_id,
        "fidList": fid_list
    }
    resp = session.post(url, json=params, timeout=10)
    return resp.json()


def _create_chart(
    *,
    dataset_id: str,
    name: str,
    meta: str,
    workflow: List[Dict[str, Any]],
    thumbnail: str
) -> Dict[str, Any]:
    url = f"{GlobalVarManager.kanaries_api_host}/chart"
    params = {
        "datasetId": dataset_id,
        "meta": meta,
        "query": json.dumps({"datasetId": dataset_id, "workflow": workflow}),
        "config": "{}",
        "name": name,
        "desc": "",
        "isPublic": True,
        "chartType": "",
        "thumbnail": thumbnail,
    }
    resp = session.post(url, json={"chart": params}, timeout=10)
    return resp.json()["data"]


def _create_notebook(title: str, chart_id: str) -> Dict[str, Any]:
    url = f"{GlobalVarManager.kanaries_api_host}/notebook"
    markdown = "\n".join([
        "# " + title,
        f"::chart[{chart_id}]"
    ])
    params = {
        "title": title,
        "markdown": markdown,
        "isPublic": True,
    }
    resp = session.post(url, json=params, timeout=10)
    return resp.json()["data"]


def _upload_file_to_s3(url: str, content: io.BytesIO):
    requests.put(url, content.getvalue(), timeout=300)


def write_config_to_cloud(path: str, config: str):
    """Write config to cloud"""
    url = f"{GlobalVarManager.kanaries_api_host}/pygConfig"
    session.put(url, json={
        "path": path,
        "config": config
    })


def read_config_from_cloud(path: str) -> str:
    """Return config, if not exist, return empty string"""
    url = f"{GlobalVarManager.kanaries_api_host}/pygConfig"
    resp = session.get(url, params={"path": path}, timeout=15)
    return resp.json()["data"]["config"]


def create_shared_chart(
    *,
    chart_name: str,
    dataset_content: io.BytesIO,
    fid_list: List[str],
    meta: str,
    new_notebook: bool,
    thumbnail: str,
) -> str:
    if not GlobalVarManager.kanaries_api_key:
        raise CloudFunctionError((
            "Please set kanaries_api_key first. "
            "If you are not kanaries user, please register it from `https://kanaries.net/home/access`. "
            "If you are kanaries user, please get your api key from `https://kanaries.net/app/u/MarilynMonroe`, go workspace detail page to get it."
        ))
    dataset_name = f"pygwalker_{datetime.now().strftime('%Y%m%d%H%M')}"
    dataset_info = _upload_dataset_meta(dataset_name, "csv")
    dataset_id = dataset_info["datasetId"]
    upload_url = dataset_info["uploadUrl"]
    _upload_file_to_s3(upload_url, dataset_content)
    _upload_dataset_callback(dataset_id, fid_list)
    chart_info = _create_chart(
        dataset_id=dataset_id,
        name=chart_name,
        meta=meta,
        workflow={},
        thumbnail=thumbnail,
    )
    if new_notebook:
        _create_notebook(chart_name, chart_info["chartId"])
    return chart_info["shareUrl"]


def create_duckdb_dataset_on_cloud(dataset_content: io.BytesIO, fid_list: List[str]) -> str:
    name = rand_str(32)
    dataset_info = _upload_dataset_meta(name, "parquet")
    dataset_id = dataset_info["datasetId"]
    upload_url = dataset_info["uploadUrl"]
    _upload_file_to_s3(upload_url, dataset_content)
    _upload_dataset_callback(dataset_id, fid_list)
    return dataset_id
