declare namespace hyphaWebsocketClient {
  type Config = {
    client_id: string;
    name: string;
    server_url: string;
  };

  function connectToServer(config: Config): Promise<any>;
}
