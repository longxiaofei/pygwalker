import React, { useState, useEffect, MutableRefObject } from "react";
import { createPortal } from 'react-dom';

import authStore from "../../store/authStore";
import initChannel from "../../utils/channel";
import LoginLoading from "./loading";

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
  const loginFrameId = `login_${props.id}`
  const loginFrameUrl = `https://plugin-auth.kanaries.net/iframe?rgba=255,255,255,0&id=${loginFrameId}`
  const [loginStatus, setLoginStatus] = useState<LoginStatus>(LoginStatus.INIT);

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
    window.addEventListener("message", (event) => {
      if (event.data.type === "channel.dispatch" && event.data.id === loginFrameId) {
        const channel = initChannel(event.ports[0])
        channel.addMessageHandler(messageHandler)
        authStore.setChannel(channel)
      }
    });
    document.getElementById(loginFrameId)?.contentWindow.postMessage({type: "channel.request"}, "*");
  }, [])

  return (
    <>
      {
        loginIconRef !== null && loginStatus !== LoginStatus.INIT && loginStatus !== LoginStatus.SUCCESS && createPortal(
          <LoginLoading />,
          loginIconRef.current?.parentElement as HTMLElement
        )
      }
      {
        loginIconRef !== null && createPortal(
          <iframe src={loginFrameUrl} style={{ position: "absolute", height: "100%", width: "100%", zIndex: 999 }} id={loginFrameId} />,
          loginIconRef.current?.parentElement as HTMLElement
        )
      }
    </>
  );
};

export default LoginIframe;
