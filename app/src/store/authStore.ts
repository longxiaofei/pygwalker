import { makeObservable, observable, action } from 'mobx';
import { IChannel } from '../utils/channel';

class AuthStore {
  channel: IChannel | null = null;

  setChannel(channel: IChannel) {
    this.channel = channel;
  }

  constructor() {
    makeObservable(this, {
      channel: observable,
      setChannel: action,
    });
  }
}

const authStore = new AuthStore();

export default authStore;
