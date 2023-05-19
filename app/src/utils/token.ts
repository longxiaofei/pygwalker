import { v4 as uuidv4 } from 'uuid';
import authStore from "../store/authStore";


interface ITokenTaskResult {
    token: string;
    cancel: () => void;
}

const getToken = async() => {
    const requestId = uuidv4();
    const tokenPromise = new Promise<ITokenTaskResult>((resolve) => {
        const handler = (event: MessageEvent) => {
            // if (event.data.type === "login.accessToken" && event.data.data.requestId === requestId) {
            if (event.data.type === "login.accessToken") {
                resolve({
                    token: event.data.data.accessToken,
                    cancel: () => { authStore.channel?.removeMessageHandler(handler); }
                })
            }
        }
        authStore.channel?.addMessageHandler(handler)
        authStore.channel?.postMessage({type: "login.accessToken", data: {"requestId": requestId}})
    })
    const tokenPromiseWithTimeout = Promise.race([
        tokenPromise,
        new Promise<ITokenTaskResult>((_, reject) => {
            setTimeout(() => {
                reject(new Error("get token timeout"))
            }, 10000)
        })
    ])
    const tokenPromiseResult = await tokenPromiseWithTimeout
    tokenPromiseResult.cancel()
    return tokenPromiseResult.token
}

export { getToken };
