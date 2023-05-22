import config from '../config';

interface IKey {
  publicKey: string;
  secretKey: string;
}

export const getKeyFromApi = async () => {
  const resp = await fetch(
    `${config.authUrl}/api/generateKey`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "symm" }),
    }
  );
  const respJson = await resp.json();
  return respJson as IKey;
}

export const decryptData = async (data: string, key: string) => {
  const resp = await fetch(
    `${config.authUrl}/api/decryptMsg`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "symm",
        secretKey: btoa(key),
        data: btoa(data),
      }),
    }
  )
  return "token";
}
