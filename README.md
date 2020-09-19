# BOTKACA

Mirror torrent to selected hosting.

## Deploy button

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/azamaulanaaa/torrent-mirror "Heroku")

## How to run

```sh
#!/bin/sh
git clone https://github.com/azamaulanaaa/torrent-mirror.git
cd torrent-mirror
docker build -t torrent-mirror .
docker run -it torrent-mirror
```
