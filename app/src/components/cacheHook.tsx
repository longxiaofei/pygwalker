import React, { useEffect, useState } from "react";
import Modal from "./modal";
import type { IGlobalStore } from '@kanaries/graphic-walker/dist/store'
import type { IStoInfo } from '@kanaries/graphic-walker/dist/utils/save';
import type { IVisSpec } from '@kanaries/graphic-walker/dist/interfaces';
import DefaultButton from './button/default'

interface ICachedHook {
  storeRef: React.MutableRefObject<IGlobalStore | null>;
  originStoInfo: IStoInfo | null;
  cacheId: string;
}

const specCachePre = "pygwalker-config-cache-";

const getSpecFromCache = (id: string): IVisSpec[] => {
  const spec = localStorage.getItem(`${specCachePre}${id}`);
  return spec ? JSON.parse(spec) : null;
}

const setSpecToCache = (id: string, spec: IVisSpec[]) => {
  localStorage.setItem(`${specCachePre}${id}`, JSON.stringify(spec));
}

const CacheHook: React.FC<ICachedHook> = (props) => {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(false);

  useEffect(() => {
    if (props.originStoInfo === null) return;
    const specCache = getSpecFromCache(props.cacheId);
    const specOrigin = props.originStoInfo?.specList || JSON.parse(JSON.stringify(props.storeRef.current?.vizStore?.exportViewSpec())) as IVisSpec[];
    if (specCache === null) {
      setStart(true);
      return
    };
    const specCacheStr = JSON.stringify(specCache.map(item => {return {...item, visId: ""}}));
    const specOriginStr = JSON.stringify(specOrigin.map(item => {return {...item, visId: ""}}));
    if (specCacheStr !== specOriginStr) {
      setOpen(true);
    } else {
      setStart(true);
    }
  }, [props.originStoInfo]);

  useEffect(() => {
    if (!start) return;
    setInterval(() => {
      const spec = props.storeRef.current?.vizStore?.exportViewSpec();
      if (spec !== undefined) {
        setSpecToCache(props.cacheId, spec);
      }
    }, 8000);
  }, [start])

  const clickRevert = () => {
    props.storeRef.current?.vizStore?.importStoInfo({
      ...props.originStoInfo,
      specList: getSpecFromCache(props.cacheId)
    } as IStoInfo);
    setOpen(false);
    setStart(true);
  }

  const clickCancel = () => {
    setOpen(false);
    setStart(true);
  }

  return (
    <Modal
      show={open}
      onClose={() => setOpen(false)}
      title="Tip"
    >
      <p>We have detected that you made changes to this view last time. Do you want to revert to the last saved version?</p>
      <DefaultButton text="revert" onClick={clickRevert} />
      <DefaultButton text="cancel" onClick={clickCancel} />
    </Modal>
  );
};

export default CacheHook;
