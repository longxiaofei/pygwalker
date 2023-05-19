interface IChannel {
  addMessageHandler: (func: Function) => void;
  removeMessageHandler: (func: Function) => void;
  postMessage: (data: any) => void;
}

const initChannel = (port: MessagePort): IChannel => {
  const messageFuncSet = new Set<Function>();

  port.onmessage = (e: MessageEvent) => {
    messageFuncSet.forEach((func) => {
      func(e);
    });
  }
  const addMessageHandler = (func: Function) => {
    messageFuncSet.add(func);
  }
  const removeMessageHandler = (func: Function) => {
    messageFuncSet.delete(func);
  }
  const postMessage = (data: any) => {
    port.postMessage(data);
  }

  return {
    addMessageHandler,
    removeMessageHandler,
    postMessage,
  }
}

export type { IChannel };
export default initChannel;

