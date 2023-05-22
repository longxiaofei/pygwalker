import { makeObservable, observable, action } from 'mobx';
import { IChannel } from '../utils/channel';

class AuthStore {
  channel: IChannel | null = null;
  aesKey: string | null = null;

  setChannel(channel: IChannel) {
    this.channel = channel;
  }

  setAesKey(aesKey: string) {
    this.aesKey = aesKey;
  }

  constructor() {
    makeObservable(this, {
      channel: observable,
      aesKey: observable,
      setChannel: action,
      setAesKey: action,
    });
  }
}

const authStore = new AuthStore();

export default authStore;
