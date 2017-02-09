
package controllers

import (
	"container/list"
	"github.com/astaxie/beego"
	"github.com/gorilla/websocket"
	"btcticker/models"
	"fmt"
	"runtime"
	"encoding/json"
	"net/http"
	"crypto/tls"
	"io/ioutil"
	"sync"
	"strconv"
	"time"
	"errors"
	"strings"
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


//########################################################################################################
//########################################################################################################
type Value struct {
	Name string
	Url_host string
	In_progress bool
	Msg_cl string
	Msg_target string
}
type Node struct {
	Value				// Embedded struct
	next, prev  *Node
}
type List struct {
	head, tail *Node
}
func (l *List) First() *Node {
	return l.head
}
func (n *Node) Next() *Node {
	return n.next
}
func (n *Node) Prev() *Node {
	return n.prev
}
// Create new node with value
func (l *List) Push(v Value) *List {
	n := &Node{Value: v}
	if l.head == nil {
		l.head = n		// First node
	} else {
		l.tail.next = n	// Add after prev last node
		n.prev = l.tail // Link back to prev last node
	}
	l.tail = n  		// reset tail to newly added node
	return l
}
func (l *List) Find(name string) *Node {
	found := false
	var ret *Node = nil
	for n := l.First(); n != nil && !found; n = n.Next() {
		if n.Value.Name == name {
			found = true
			ret = n
		}
	}
	return ret
}
func (l *List) Delete(name string) bool {
	success := false
	node2del := l.Find(name)
	if node2del != nil {
		fmt.Println("Delete - FOUND: ", name)
		prev_node := node2del.prev
		next_node := node2del.next
		// Remove this node
		prev_node.next = node2del.next
		next_node.prev = node2del.prev
		success = true
	}
	return success
}
var errEmpty = errors.New("ERROR - List is empty")
// Pop last item from list
func (l *List) Pop() (v Value, err error) {
	if l.tail == nil {
		err = errEmpty
	} else {
		v = l.tail.Value
		l.tail = l.tail.prev
		if l.tail == nil {
			l.head = nil
		}
	}
	return v, err
}
//########################################################################################################
//########################################################################################################

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


	price_sources = new(List)  // Create Doubly Linked List
	dashes = strings.Repeat("-", 50)
	processed = make(map[*Node]bool)


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
				//go func() {
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
				//}()
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

/*
	//=========================================================================================================
	TODO: Pieprasījumi:

	https://btc-e.com/api/2/btc_usd/ticker:  Response: {"ticker":{"high":1014.291,"low":988.628,"avg":1001.4595,"vol":4785411.39115,"vol_cur":4780.58813,"last":992.999,"buy":992.999,"sell":992.001,"updated":1486302789,"server_time":1486302790}}

	https://btc-e.com/api/2/btc_eur/ticker:  Response: {"ticker":{"high":967.5,"low":937.86101,"avg":952.680505,"vol":53526.62568,"vol_cur":56.15161,"last":945,"buy":949.64199,"sell":945.00001,"updated":1486302835,"server_time":1486302837}}

	https://data.btcchina.com/data/trades

	[{"date":"1486216884","price":7110,"amount":0.001,"tid":"123520693"},{"date":"1486216915","price":7109.99,"amount":10,"tid":"123520694"},{"date":"1486216950","price":7110,"amount":0.0142,"tid":"123520695"},{"date":"1486216997","price":7109.99,"amount":0.0045,"tid":"123520696"},{"date":"1486217018","price":7109.99,"amount":0.0002,"tid":"123520697"},{"date":"1486217018","price":7110,"amount":0.0541,"tid":"123520698"},{"date":"1486217041","price":7110,"amount":0.0047,"tid":"123520699"},{"date":"1486217095","price":7100.51,"amount":0.0219,"tid":"123520700"},{"date":"1486217101","price":7109.99,"amount":1,"tid":"123520701"},{"date":"1486217101","price":7109.99,"amount":3,"tid":"123520702"},{"date":"1486217101","price":7109.99,"amount":1,"tid":"123520703"},{"date":"1486217101","price":7109.99,"amount":6,"tid":"123520704"},{"date":"1486217101","price":7109.99,"amount":1,"tid":"123520705"},{"date":"1486217123","price":7110,"amount":0.1723,"tid":"123520706"},{"date":"1486217123","price":7110,"amount":0.0602,"tid":"123520707"},{"date":"1486217123","price":7110.85,"amount":0.11,"tid":"123520708"},{"date":"1486217123","price":7115,"amount":0.001,"tid":"123520709"},{"date":"1486217123","price":7115,"amount":0.194,"tid":"123520710"},{"date":"1486217123","price":7118,"amount":0.996,"tid":"123520711"},{"date":"1486217123","price":7118,"amount":1,"tid":"123520712"},{"date":"1486217123","price":7118,"amount":0.232,"tid":"123520713"},{"date":"1486217123","price":7118,"amount":0.0097,"tid":"123520714"},{"date":"1486217123","price":7119,"amount":0.008,"tid":"123520715"},{"date":"1486217123","price":7119.98,"amount":0.0635,"tid":"123520716"},{"date":"1486217123","price":7120,"amount":0.3099,"tid":"123520717"},


	https://api.cryptonator.com/api/ticker/btc-usd

	{"ticker":{"base":"BTC","target":"USD","price":"1013.55180841","volume":"35105.26779886","change":"-0.94918916"},"timestamp":1486303741,"success":true,"error":""}


	//=========================================================================================================
*/
	price_sources.Push(Value{Name: "BTC-USD-coinbase-buy", Url_host: "https://api.coinbase.com/v2/prices/BTC-USD/buy", Msg_cl: "USD/BTC", Msg_target: "BUY"})
	price_sources.Push(Value{Name: "BTC-USD-coinbase-sell", Url_host: "https://api.coinbase.com/v2/prices/BTC-USD/sell", Msg_cl: "USD/BTC", Msg_target: "SELL"})
	price_sources.Push(Value{Name: "BTC-EUR-coinbase-buy",  Url_host: "https://api.coinbase.com/v2/prices/BTC-EUR/buy", Msg_cl: "EUR/BTC", Msg_target: "BUY"})
	price_sources.Push(Value{Name: "BTC-EUR-coinbase-sell", Url_host: "https://api.coinbase.com/v2/prices/BTC-EUR/sell", Msg_cl: "EUR/BTC", Msg_target: "SELL"})
	price_sources.Push(Value{Name: "BTC-USD-coinbase-spot", Url_host: "https://api.coinbase.com/v2/prices/spot?currency=USD", Msg_cl: "USD/BTC", Msg_target: "SPOT"})
	price_sources.Push(Value{Name: "BTC-EUR-coinbase-spot", Url_host: "https://api.coinbase.com/v2/prices/spot?currency=EUR", Msg_cl: "EUR/BTC", Msg_target: "SPOT"})


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
/*
var elem_num = 0;

	fmt.Println(dashes)

	for ps2 := price_sources.First(); ps2 != nil; ps2 = ps2.Next()  {

		fmt.Printf("Element:[%d] In_progress:[%v]\n", elem_num, ps2.Value.In_progress)
		elem_num++;

		if processed[ps2] {
			fmt.Printf("%s as been processed\n", ps2.Value)
		}
		//processed[ps2] = true
	}
*/
	fmt.Println(dashes)

	for ps := price_sources.First(); ps != nil; ps = ps.Next()  {
		if (!ps.Value.In_progress){      // in_progress not used now

			processed[ps] = true
			ps.Value.In_progress = true

			ps_obj := ps.Value
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
						fmt.Printf("[%s] json.Unmarshal error: %s\n", obj_str , err)
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

					processed[ps] = false
					ps.Value.In_progress = false

				},
			}.Do()


//#############################################################################################################################
//#############################################################################################################################

		//	trace()
		}  else {
			ps_obj := ps.Value
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