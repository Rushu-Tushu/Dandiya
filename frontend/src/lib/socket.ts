import { MessageEnvelope } from '../types';

export type WSEventCallback = (event: {
  type: string;
  conversationId?: string;
  senderId?: string;
  recipientId?: string;
  messageEnvelope?: MessageEnvelope;
  payload?: any;
  timestamp?: string;
}) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<WSEventCallback>();
  private reconnectTimeout: any = null;
  private isConnecting = false;
  private shouldReconnect = true;

  public connect(token: string) {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.shouldReconnect = true;
    this.isConnecting = true;

    let wsUrl: string;
    const rawWs = import.meta.env.VITE_WS_URL ? String(import.meta.env.VITE_WS_URL).trim() : '';
    const rawApi = import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).trim() : '';

    if (rawWs) {
      const baseWs = rawWs.replace(/\/$/, '');
      wsUrl = `${baseWs}/ws?token=${encodeURIComponent(token)}`;
    } else if (rawApi) {
      const wsOrigin = rawApi.replace(/^http/i, 'ws').replace(/\/$/, '');
      wsUrl = `${wsOrigin}/ws?token=${encodeURIComponent(token)}`;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;
    }

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.isConnecting = false;
      console.log('⚡ [WebSocket] Connected to Dandiya Realtime Service');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.listeners.forEach((callback) => callback(data));
      } catch (err) {
        console.error('[WebSocket] Failed to parse event:', err);
      }
    };

    this.ws.onclose = () => {
      this.isConnecting = false;
      this.ws = null;
      if (this.shouldReconnect) {
        this.reconnectTimeout = setTimeout(() => {
          const currentToken = localStorage.getItem('dandiya_auth_token');
          if (currentToken) {
            this.connect(currentToken);
          }
        }, 3000);
      }
    };

    this.ws.onerror = (err) => {
      console.warn('[WebSocket] Error:', err);
      this.ws?.close();
    };
  }

  public disconnect() {
    this.shouldReconnect = false;
    clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public subscribe(callback: WSEventCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public isOpen(): boolean {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  public isConnectingState(): boolean {
    return this.isConnecting || (!!this.ws && this.ws.readyState === WebSocket.CONNECTING);
  }

  public send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('[WebSocket] Socket not ready, message not sent via WS');
    }
  }

  public sendTyping(conversationId: string, isTyping: boolean) {
    this.send({
      type: isTyping ? 'typing_start' : 'typing_stop',
      conversationId,
    });
  }
}

export const wsClient = new WebSocketClient();
