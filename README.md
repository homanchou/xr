# Xr

This repo contains a book (work in progress) for a Guide to creating a multiplayer VR website using in Babylon.js, Phoenix/Elixir and WebRTC.

The book is written within and along side this code repository.

## Setup Instructions

After downloading this repository.

Start postgres in docker container.  Requires docker and docker-compose.

```bash
docker-compose up -d
```

Create DB
```bash
mix ecto.reset
```

Download npm using nvm.  Requires nvm installed first.  
```bash
use nvm
```

Start server with
```
iex -S mix phx.server
```