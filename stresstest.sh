#!/usr/bin/env bash

# oha \
#     -n 200 \
#     -c 200 \
#     -z 30s \
#     --fps 30 \
#     --method GET \
#     -t 10s \
#     -H "Accept-Encoding: gzip, deflate, br, zstd" \
#     "http://localhost:7171/battlebit"

seq 1 1200 | \
    xargs -n1 -P1200 \
    curl -i -N -H "Connection: Upgrade" \
        -H "Upgrade: websocket" \
        -H "Host: 127.0.0.1:7171/battlebit" \
        -H "Origin: http://127.0.0.1:7171/battlebit" \
        -H "Sec-WebSocket-Version: 13" \
        -H 'Sec-WebSocket-Key: 17' \
        http://127.0.0.1:7171/battlebit/websocket \
        --output /dev/null 2> /dev/null
