
package controllers

import (
	"container/list"
	"github.com/astaxie/beego"
	"github.com/gorilla/websocket"
	"BTCTicker/models"
	"fmt"
	"runtime"
	"encoding/json"
	"net/http"
	"crypto/tls"
	"io/ioutil"
	"sync"
	"strconv"
	"time"
)

type Subscription struct {
	Archive []models.Event      // All the events from the archive.
	New     <-chan models.Event // New events coming in.
}

func newEvent(ep models.EventType, user, msg string, clmsg, Msg_target string, clamount float64, clcurrency string) models.Event {
	return models.Event{ep, user, int64(time.Now().Unix()), msg, string(clmsg), Msg_target, float64(clamount), string(clcurrency)}
}

func Join(user string, ws *websocket.Conn) {
	subscribe <- Subscriber{Name: user, Conn: ws}
}

func Leave(user string) {
	unsubscribe <- user
}

type Subscriber struct {
	Name string
	Conn *websocket.Conn // Only for WebSocket users; otherwise nil.
}

type PriceSource struct {
	Name string
	Url_host string
	In_progress bool
	Msg_cl string
	Msg_target string
}
func (f *PriceSource) SetInProgress() {
	f.In_progress = true
}

func (f *PriceSource) ClearInProgress() {
	f.In_progress = false
}


func (r PriceSource) GetPrice() {
	fmt.Println("PriceSource GetPrice()")
}

func newPriceSource(Name, Url_host, Msg_cl, Msg_target string) PriceSource {
	return PriceSource{Name, Url_host, false, Msg_cl, Msg_target}
}

type Block struct {
	Try     func()
	Catch   func(Exception)
	Finally func()
}

type Exception interface{}

func Throw(up Exception) {
	panic(up)
}

func (tcf Block) Do() {
	if tcf.Finally != nil {
		defer tcf.Finally()
	}
	if tcf.Catch != nil {
		defer func() {
			if r := recover(); r != nil {
				tcf.Catch(r)
			}
		}()
	}
	tcf.Try()
}

var (
	// Channel for new join users.
	subscribe = make(chan Subscriber, 10)
	// Channel for exit users.
	unsubscribe = make(chan string, 10)
	// Send events here to publish them.
	publish = make(chan models.Event, 10)

	publish_tmp = make(chan models.Event, 10)

	ticker_active = false
	timeChan = time.NewTimer(time.Second * 2).C
	ticker = time.NewTicker(time.Second * 2)
	tickChan = ticker.C
	doneChan = make(chan bool)
	//arcChan = make(chan Subscriber, 10)

	// Long polling waiting list.
	waitingList = list.New()
	subscribers = list.New()

	price_sources = list.New()
	m sync.Mutex
	wg sync.WaitGroup

)

// This function handles all incoming chan messages.
func btcticker_loop() {

// End of check sources after time
	go func() {
		time.Sleep(time.Second * 60 * 180)
		doneChan <- true
	}()




	for {
		select {

		case <- timeChan:
			beego.Info("Ticker started")
			ticker_active = true
		case <- tickChan:
			if (ticker_active) {
				beego.Info("Ticker ticked")
				Block{
					Try: func() {
						ticker.Stop()
						checkPriceSources();
						//Throw("Oh,...sh...")
					},
					Catch: func(e Exception) {
					fmt.Printf("tickChan -> Caught %v\n", e)
					},
					Finally: func() {
						ticker = time.NewTicker(time.Second * 5)
						tickChan = ticker.C
					},
				}.Do()
			}
		case <- doneChan:
			fmt.Println("Done")
			ticker.Stop()

//		case sub := <-arcChan:
/*
			fmt.Printf("[START] SendArchiveData -->>> User:[%s]\n", sub.Name)

			Block{
				Try: func() {
					wg.Add(1);
					go func() {
						m.Lock()
						//SendArchiveData(sub)      // TODO: Queue to write in websocket
						m.Unlock()
						wg.Done()
					}()
					wg.Wait()
					//Throw("Oh,...sh...")
				},
				Catch: func(e Exception) {
					fmt.Printf("SendArchiveData -->>> Caught %v\n", e)
				},
				Finally: func() {
					fmt.Println("SendArchiveData -->>> Finally...\n")

				},
			}.Do()

			fmt.Printf("[END] SendArchiveData -->>> User:[%s]\n", sub.Name)
*/
		case sub := <-subscribe:



			if !isUserExist(subscribers, sub.Name) {
				subscribers.PushBack(sub) // Add user to the end of list.
				// Publish a JOIN event.

				//arcChan <- sub
				publish_tmp <- newEvent(models.EVENT_JOIN, sub.Name, "", "", "", 0, "")
				beego.Info("New user:", sub.Name, ";WebSocket:", sub.Conn != nil)
			} else {
				//arcChan <- sub
				beego.Info("Old user:", sub.Name, ";WebSocket:", sub.Conn != nil)
			}




		case event_tmp := <-publish_tmp:


			wg.Add(1);
			go func() {
				m.Lock()
				models.NewArchive(event_tmp)     // Last 20 records for new subscribers
				m.Unlock()
				wg.Done()
			}()
			wg.Wait()
				publish <- event_tmp


		case event := <-publish:
			// Notify waiting list.
			for ch := waitingList.Back(); ch != nil; ch = ch.Prev() {
				ch.Value.(chan bool) <- true
				waitingList.Remove(ch)
			}

			broadcastWebSocket(event)
			//models.NewArchive(event)

			if event.Type == models.EVENT_MESSAGE {
				beego.Info("Message from", event.User, ";Content:", event.Content)
			}
		case unsub := <-unsubscribe:
			for sub := subscribers.Front(); sub != nil; sub = sub.Next() {
				if sub.Value.(Subscriber).Name == unsub {
					subscribers.Remove(sub)
					// Clone connection.
					ws := sub.Value.(Subscriber).Conn
					if ws != nil {
						ws.Close()
						beego.Error("WebSocket closed:", unsub)
					}
					publish_tmp <- newEvent(models.EVENT_LEAVE, unsub, "", "", "", 0, "") // Publish a LEAVE event.
					break
				}
			}
		}
	}

	ticker.Stop()
}

func init() {




	price_sources.PushBack(newPriceSource("BTC-USD-coinbase-buy",  "https://api.coinbase.com/v2/prices/BTC-USD/buy","USD/BTC","BUY")) // Add price_source to the end of list.
	price_sources.PushBack(newPriceSource("BTC-USD-coinbase-sell", "https://api.coinbase.com/v2/prices/BTC-USD/sell","USD/BTC","SELL"))
	price_sources.PushBack(newPriceSource("BTC-EUR-coinbase-buy",  "https://api.coinbase.com/v2/prices/BTC-EUR/buy","EUR/BTC","BUY"))
	price_sources.PushBack(newPriceSource("BTC-EUR-coinbase-sell", "https://api.coinbase.com/v2/prices/BTC-EUR/sell","EUR/BTC","SELL"))
	price_sources.PushBack(newPriceSource("BTC-USD-coinbase-spot", "https://api.coinbase.com/v2/prices/spot?currency=USD","USD/BTC","SPOT"))
	price_sources.PushBack(newPriceSource("BTC-EUR-coinbase-spot", "https://api.coinbase.com/v2/prices/spot?currency=EUR","EUR/BTC","SPOT"))




	go btcticker_loop()
}

func isUserExist(subscribers *list.List, user string) bool {
	for sub := subscribers.Front(); sub != nil; sub = sub.Next() {
		if sub.Value.(Subscriber).Name == user {
			return true
		}
	}
	return false
}



func checkPriceSources () {


	for ps := price_sources.Front(); ps != nil; ps = ps.Next()  {
		if (!ps.Value.(PriceSource).In_progress){      // in_progress not used now

			ps_obj := ps.Value.(PriceSource)
			ps_name := ps_obj.Name
			url_host := ps_obj.Url_host
			msg_cl := ps_obj.Msg_cl
			msg_target := ps_obj.Msg_target

			obj_str := fmt.Sprintf("Receive data from: ps_name:[%s] url_host:[%s]\n", ps_name, url_host)

			fmt.Println(obj_str)

			req, err := http.NewRequest("GET", url_host, nil)
			if err != nil {
				fmt.Printf("[%s] http.NewRequest error: %s\n",obj_str , err)
				continue
			}

			req.Header.Set("Content-Type", "application/json")
			req.Header.Add("CB-VERSION", "2015-04-08")

			// Create New http Transport
			transCfg := &http.Transport{
				TLSClientConfig: &tls.Config{InsecureSkipVerify: true}, // disable verify
			}
			// Create Http Client
			client := &http.Client{Transport: transCfg}

			response, err := client.Do(req)
			if err != nil {
				fmt.Printf("[%s] client request error: %s\n",obj_str , err)
				continue
			}




			// Close After Read Body
			defer response.Body.Close()
			// Read Body
			data, err := ioutil.ReadAll(response.Body)
			// Check Error
			if err != nil {
				fmt.Printf("[%s] ioutil.ReadAll error: %s\n",obj_str , err)
				continue
			}


			// Print response html : convert byte to string
			fmt.Printf("\nResponse: %s\n", string(data))  // Response: {"data":{"amount":"1021.03","currency":"USD"}}


//#############################################################################################################################
//#############################################################################################################################


			Block{
				Try: func() {

//==============================================================================================================================
					var dat map[string]interface{}
					//var curr_data map[string]interface{}

					if err := json.Unmarshal(data, &dat); err != nil {
						panic(err)
					}
					//fmt.Println(dat)  // map[data:map[amount:1022.42 currency:USD]]


					curr_data := dat["data"]
					if (curr_data != nil){
						//fmt.Printf("curr_data:[%s]\n", curr_data)    // curr_data:[map[amount:948.04 currency:EUR]]


						md := curr_data.(map[string]interface{})

						amount := md["amount"]
						if (amount != nil) {
							currency := md["currency"]
							if (currency != nil) {

							//fmt.Printf("amount:[%s]\n", amount)

							//fmt.Printf("currency:[%s]\n", currency)


							evt_str := fmt.Sprintf("Type:[%s] amount:[%s] currency:[%s]\n", ps_name, amount, currency)

								amount_str := fmt.Sprintf("%s", amount)
								currency_str := fmt.Sprintf("%s", currency)

								fl_amount, err := strconv.ParseFloat(amount_str, 64)
								if err != nil {
									fmt.Printf("[%s] strconv.ParseFloat error: %s\n", obj_str , err)
								}

							publish_tmp <- newEvent(models.EVENT_MESSAGE, "tick", evt_str, msg_cl, msg_target, float64(fl_amount), currency_str)



							} else {
								fmt.Printf("[%s] response currency not assigned.\n",obj_str)
							}
						} else {
							fmt.Printf("[%s] response amount not assigned.\n",obj_str)
						}
					} else {
						fmt.Printf("[%s] response data not assigned.\n",obj_str)
					}

					//Throw("Oh,...sh...")
//==============================================================================================================================

				},
				Catch: func(e Exception) {
					fmt.Printf("[%s] Caught %v\n",obj_str , e)
				},
				Finally: func() {



				},
			}.Do()


//#############################################################################################################################
//#############################################################################################################################





			//ps.Value.(PriceSource).SetInProgress()
			//ps.Value.(PriceSource).GetPrice()


		//	trace()
		}  else {
			ps_obj := ps.Value.(PriceSource)
			fmt.Printf("[%s] in progress ...\n", ps_obj.Name)
		}
	}



}


func trace() {
	pc := make([]uintptr, 10)  // at least 1 entry needed
	runtime.Callers(2, pc)
	f := runtime.FuncForPC(pc[0])
	file, line := f.FileLine(pc[0])
	fmt.Printf("%s:%d %s\n", file, line, f.Name())
}


func SendArchiveData(sub Subscriber) {

	if !isUserExist(subscribers, sub.Name) {
		fmt.Printf("SendArchiveData User:[%s] not found.\n", sub.Name)
		return
	}

	lastReceived := 0
	events := models.GetEvents(int64(lastReceived))
	if len(events) > 0 {

		for i := 0; i < len(events); i++ {
			evt_obj := events[i]  //.(models.Event)

			//fmt.Printf("evt_obj.Content: %s\n", string(evt_obj.Content))
			data, err := json.Marshal(evt_obj)
			if err != nil {
				beego.Error("Fail to marshal event:", err)
				continue
			}

			for sub_tmp := subscribers.Front(); sub_tmp != nil; sub_tmp = sub_tmp.Next() {
				if sub_tmp.Value.(Subscriber).Name == sub.Name {

					// Immediately send event to WebSocket user.
					//ws := sub.Conn
					ws := sub_tmp.Value.(Subscriber).Conn
					if ws != nil {


						Block{
							Try: func() {
								if ws.WriteMessage(websocket.TextMessage, data) != nil {
									// User disconnected.
									unsubscribe <- sub.Name
								}
							},
							Catch: func(e Exception) {
								fmt.Printf("SendArchiveData -> Caught %v\n", e)
							},
							Finally: func() {
								//fmt.Printf("SendArchiveData -> [%s] Finally ...\n", sub.Name)
							},
						}.Do()



					}


				break;
				}
			}



		}
	}


}