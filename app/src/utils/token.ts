import { v4 as uuidv4 } from 'uuid';
import authStore from "../store/authStore";
import { decryptData } from './crypto';


interface ITokenTaskResult {
    token: string;
    cancel: () => void;
}

const getToken = async() => {
    const requestId = uuidv4();
    const tokenPromise = new Promise<ITokenTaskResult>((resolve, reject) => {
        const handler = (event: MessageEvent) => {
            console.log(event)
            // if (event.data.type === "login.accessToken" && event.data.data.requestId === requestId) {
            if (event.data.type === "login.accessToken") {
                resolve({
                    token: event.data.data.accessToken,
                    cancel: () => { authStore.channel?.removeMessageHandler(handler); }
                })
            }
        }
        setTimeout(() => {
            authStore.channel?.removeMessageHandler(handler);
            reject(new Error("get token timeout"))
        }, 10000)
        authStore.channel?.addMessageHandler(handler)
        authStore.channel?.postMessage({type: "login.accessToken", data: {"requestId": requestId}})
    })

    const tokenPromiseResult = await tokenPromise
    tokenPromiseResult.cancel()

    const decryptedToken = await decryptData(tokenPromiseResult.token, authStore.aesKey as string);
    
    return decryptedToken
    // return tokenPromiseResult.token
}

export { getToken };
