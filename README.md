# BTCTicker



This simple BTC Realtime Ticker using Long Polling and WebSocket to build a web-based ticker on beego.

## Installation on windows MINGW64

```
	git clone https://github.com/Limbo67/BTCTicker
										
	cd BTCTicker
										
	export GOPATH=`pwd`
										
	go get github.com/gorilla/websocket
										
	go get github.com/astaxie/beego
										
	go get github.com/beego/i18n
										
	go build BTCTicker.go
										
	./BTCTicker.exe
```

## Usage

enter ticker room from 

```
http://localhost:8080 
```
