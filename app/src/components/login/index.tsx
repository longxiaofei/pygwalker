import React, { useState, useEffect, MutableRefObject } from "react";
import { createPortal } from 'react-dom';

import authStore from "../../store/authStore";
import initChannel from "../../utils/channel";
import LoginLoading from "./loading";
import config from "../../config";
import { getKeyFromApi } from "../../utils/crypto";

interface IloginLoadingProps {
  id: string;
  loginIconRef: MutableRefObject<SVGSVGElement | null>;
}

enum LoginStatus {
  INIT = "init",
  WAIT_RESPONSE = "waitResponse",
  WAIT_TOKEN = "waitToken",
  SUCCESS = "success",
}

const LoginIframe: React.FC<IloginLoadingProps> = (props) => {
  const { loginIconRef } = props;
  const [loginStatus, setLoginStatus] = useState<LoginStatus>(LoginStatus.INIT);
  const [encodeKey, setEncodeKey] = useState<string>("");

  const messageHandler = (event: MessageEvent) => {
    const eventType = event.data.type
    if (eventType === "login.toggled") {
      if (event.data.data.status === "opened") {
        setLoginStatus(LoginStatus.WAIT_RESPONSE)
      } else {
        setLoginStatus(LoginStatus.INIT)
      }
    } else if (eventType === "login.status") {
      if (event.data.data.status === "PENDING") {
        setLoginStatus(LoginStatus.WAIT_RESPONSE)
      } else if (event.data.data.status === "LOGGED_IN") {
        authStore.channel?.postMessage({type: "login.accessToken"})
        setLoginStatus(LoginStatus.WAIT_TOKEN)
      }
    }
    else if (eventType === "login.accessToken") {
      localStorage.setItem("pyg_token", event.data.data.accessToken)
      setLoginStatus(LoginStatus.SUCCESS)
    }
  }

  useEffect(() => {
    const initIframe = async () => {
      const keyInfo = await getKeyFromApi();
      authStore.setAesKey(keyInfo.secretKey);
      setEncodeKey(keyInfo.publicKey);
    }
    initIframe();
  }, [])

  useEffect(() => {
    window.addEventListener("message", (event) => {
      if (event.data.type === "channel.dispatch" && event.data.id === encodeKey) {
        const channel = initChannel(event.ports[0])
        channel.addMessageHandler(messageHandler)
        authStore.setChannel(channel)
      }
    });
    document.getElementById(encodeKey)?.contentWindow.postMessage({type: "channel.request"}, "*");
  }, [encodeKey])

  return (
    <>
      {
        loginIconRef !== null && encodeKey !== "" && loginStatus !== LoginStatus.INIT && loginStatus !== LoginStatus.SUCCESS && createPortal(
          <LoginLoading />,
          loginIconRef.current?.parentElement as HTMLElement
        )
      }
      {
        loginIconRef !== null && encodeKey !== "" && createPortal(
          <iframe
            // src={`https://plugin-auth.kanaries.net/iframe?rgba=255,255,255,0&id=${encodeKey}`}
            src={`${config.authUrl}/iframe?rgba=255,255,255,0&id=${encodeKey}`}
            style={{ position: "absolute", height: "100%", width: "100%", zIndex: 999 }}
            id={encodeKey}
          />,
          loginIconRef.current?.parentElement as HTMLElement
        )
      }
    </>
  );
};

export default LoginIframe;
