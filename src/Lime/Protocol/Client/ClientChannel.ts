namespace Lime {

  export interface IClientChannel extends IChannel {
    startNewSession(): void;
    negotiateSession(sessionCompression: string, sessionEncryption: string): void;
    authenticateSession(identity: string, authentication: IAuthentication, instance: string): void;
    sendFinishingSession(): void;

    onSessionNegotiating: ISessionListener;
    onSessionAuthenticating: ISessionListener;
    onSessionEstablished: ISessionListener;
    onSessionFinished: ISessionListener;
    onSessionFailed: ISessionListener;
  }

  export class ClientChannel extends Channel implements IClientChannel {
    constructor(transport: ITransport, autoReplyPings: boolean = true, autoNotifyReceipt: boolean = false) {
      super(transport, autoReplyPings, autoNotifyReceipt);
      super.onSession = s => {
        this.sessionId = s.id;
        this.state = s.state;

        if (s.state === SessionState.established) {
          this.localNode = s.to;
          this.remoteNode = s.from;
        } else if (s.state === SessionState.finished || s.state === SessionState.failed) {
          try {
            this.transport.close();
          } catch (e) {
            console.error(e);
          }
        }

        switch (s.state) {
          case SessionState.negotiating:
            if (this.onSessionNegotiating != null) {
              this.onSessionNegotiating(s);
            }
            break;
          case SessionState.authenticating:
            if (this.onSessionAuthenticating != null) {
              this.onSessionAuthenticating(s);
            }
            break;
          case SessionState.established:
            if (this.onSessionEstablished != null) {
              this.onSessionEstablished(s);
            }
            break;
          case SessionState.finished:
            if (this.onSessionFinished != null) {
              this.onSessionFinished(s);
            }
          case SessionState.failed:
            if (this.onSessionFailed != null) {
              this.onSessionFailed(s);
            }
          default:
        }
      }
    }

    startNewSession() {
      if (this.state !== SessionState.new) {
        throw `Cannot start a session in the '${this.state}' state.`;
      }

      const session: ISession = {
        state: SessionState.new
      };
      this.sendSession(session);
    }

    negotiateSession(sessionCompression: string, sessionEncryption: string) {
      if (this.state !== SessionState.negotiating) {
        throw `Cannot negotiate a session in the '${this.state}' state.`;
      }
      const session: ISession = {
        id: this.sessionId,
        state: SessionState.negotiating,
        compression: sessionCompression,
        encryption: sessionEncryption
      };
      this.sendSession(session);
    }

    authenticateSession(identity: string, authentication: IAuthentication, instance: string) {
      if (this.state !== SessionState.authenticating) {
        throw `Cannot authenticate a session in the '${this.state}' state.`;
      }

      let scheme: string = authentication.scheme || "unknown";

      const session: ISession = {
        id: this.sessionId,
        state: SessionState.authenticating,
        from: `${identity}/${instance}`,
        scheme: scheme,
        authentication: authentication
      };
      this.sendSession(session);
    }

    sendFinishingSession() {
      if (this.state !== SessionState.established) {
        throw `Cannot finish a session in the '${this.state}' state.`;
      }

      const session: ISession = {
        id: this.sessionId,
        state: SessionState.finishing
      };
      this.sendSession(session);
    }

    onSessionNegotiating(session: ISession) {}
    onSessionAuthenticating(session: ISession) {}
    onSessionEstablished(session: ISession) {}
    onSessionFinished(session: ISession) {}
    onSessionFailed(session: ISession) {}
  }
}