var lastReceived = 0;
var isWait = false;

var fetch = function () {
    if (isWait) return;
    isWait = true;
    $.getJSON("/lp/fetch?lastReceived=" + lastReceived, function (data) {
        if (data == null) return;
        $.each(data, function (i, event) {
            switch (event.Type) {
            case 0: // JOIN
                if (event.User == $('#uname').text()) {
                    $("#tickerbox li").first().before("<li>You joined the BTC Realtime Ticker room.</li>");
                } else {
                    $("#tickerbox li").first().before("<li>" + event.User + " joined the BTC Realtime Ticker room.</li>");
                }
                break;
            case 1: // LEAVE
                $("#tickerbox li").first().before("<li>" + event.User + " left the BTC Realtime Ticker room.</li>");
                break;
            case 2: // MESSAGE
                $("#tickerbox li").first().before("<li><b>" + event.User + "["+WebCMS.unixToStr(event.Timestamp)+"]"+"</b>: " + event.Content + "</li>");

                $("#info_panel_time").html("<h3>BTCTicker current: "+WebCMS.unixToStr(event.Timestamp)+"</h3>");

//==========================================================================
                    if (event.Msg_target == "BUY"){
                        if (event.Msg_cl == "EUR/BTC"){
                            $("#left-panel-line1-1").html(event.Amount);
                            $("#left-panel-line1-2").html(event.Msg_cl);
                        }}

                    if (event.Msg_target == "BUY"){
                        if (event.Msg_cl == "USD/BTC"){
                            $("#left-panel-line1-3").html(event.Amount);
                            $("#left-panel-line1-4").html(event.Msg_cl);
                        }}
//==========================================================================
//==========================================================================
                    if (event.Msg_target == "SELL"){
                        if (event.Msg_cl == "EUR/BTC"){
                            $("#left-panel-line2-1").html(event.Amount);
                            $("#left-panel-line2-2").html(event.Msg_cl);
                        }}

                    if (event.Msg_target == "SELL"){
                        if (event.Msg_cl == "USD/BTC"){
                            $("#left-panel-line2-3").html(event.Amount);
                            $("#left-panel-line2-4").html(event.Msg_cl);
                        }}
//==========================================================================
//==========================================================================
                    if (event.Msg_target == "SPOT"){
                        if (event.Msg_cl == "EUR/BTC"){
                            $("#left-panel-line3-1").html(event.Amount);
                            $("#left-panel-line3-2").html(event.Msg_cl);
                        }}

                    if (event.Msg_target == "SELL"){
                        if (event.Msg_cl == "USD/BTC"){
                            $("#left-panel-line3-3").html(event.Amount);
                            $("#left-panel-line3-4").html(event.Msg_cl);
                        }}
//==========================================================================


                break;
            }

            lastReceived = event.Timestamp;
        });
        isWait = false;
    });
}

// Call fetch every 3 seconds
setInterval(fetch, 3000);

fetch();

$(document).ready(function () {

    var postConecnt = function () {
        var uname = $('#uname').text();
        var content = $('#sendbox').val();
        $.post("/lp/post", {
            uname: uname,
            content: content
        });
        $('#sendbox').val("");
    }

    $('#sendbtn').click(function () {
        postConecnt();
    });
});