
package controllers

import (
	"BTCTicker/models"
)

// LongPollingController handles long polling requests.
type LongPollingController struct {
	baseController
}

// Join method handles GET requests for LongPollingController.
func (this *LongPollingController) Join() {
	// Safe check.
	uname := this.GetString("uname")
	if len(uname) == 0 {
		this.Redirect("/", 302)
		return
	}

	// Join chat room.
	Join(uname, nil)

	this.TplName = "longpolling.html"
	this.Data["IsLongPolling"] = true
	this.Data["UserName"] = uname
}

// Post method handles receive messages requests for LongPollingController.
func (this *LongPollingController) Post() {
	this.TplName = "longpolling.html"

	uname := this.GetString("uname")
	content := this.GetString("content")
	if len(uname) == 0 || len(content) == 0 {
		return
	}

	publish_tmp <- newEvent(models.EVENT_MESSAGE, uname, content, "", "", 0, "")
}

// Fetch method handles fetch archives requests for LongPollingController.
func (this *LongPollingController) Fetch() {
	lastReceived, err := this.GetInt64("lastReceived")
	if err != nil {
		return
	}

	events := make([]models.Event, 0, 0)

	wg.Add(1);
	go func() {
		m.Lock()
		events = models.GetEvents(int64(lastReceived))
		m.Unlock()
		wg.Done()
	}()
	wg.Wait()


	if len(events) > 0 {
		this.Data["json"] = events
		this.ServeJSON()
		return
	}

	// Wait for new message(s).
	ch := make(chan bool)
	waitingList.PushBack(ch)
	<-ch

	wg.Add(1);
	go func() {
		m.Lock()
		events = models.GetEvents(int64(lastReceived))
		m.Unlock()
		wg.Done()
	}()
	wg.Wait()

	if len(events) > 0 {
		//this.Data["json"] = models.GetEvents(int(lastReceived))
		this.Data["json"] = events
		this.ServeJSON()
	}
}
