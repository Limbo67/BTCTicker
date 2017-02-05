var socket;

$(document).ready(function () {
    // Create a socket
    socket = new WebSocket('ws://' + window.location.host + '/ws/join?uname=' + $('#uname').text());
    // Message received on the socket
    socket.onmessage = function (event) {
        var data = JSON.parse(event.data);
        console.log(data);
        switch (data.Type) {
        case 0: // JOIN
            if (data.User == $('#uname').text()) {
                $("#tickerbox li").first().before("<li>You joined the BTC Realtime Ticker room.</li>");
            } else {
                $("#tickerbox li").first().before("<li>" + data.User + " joined the BTC Realtime Ticker room.</li>");
            }
            break;
        case 1: // LEAVE
            $("#tickerbox li").first().before("<li>" + data.User + " left the BTC Realtime Ticker room.</li>");
            break;
        case 2: // MESSAGE
            $("#tickerbox li").first().before("<li><b>" + data.User + "["+WebCMS.unixToStr(data.Timestamp)+"]"+"</b>: " + data.Content + "</li>");


            $("#info_panel_time").html("<h3>BTCTicker current: "+WebCMS.unixToStr(data.Timestamp)+"</h3>");
//==========================================================================
            if (data.Msg_target == "BUY"){
                 if (data.Msg_cl == "EUR/BTC"){
                    $("#left-panel-line1-1").html(data.Amount);
                    $("#left-panel-line1-2").html(data.Msg_cl);
                 }}

            if (data.Msg_target == "BUY"){
                if (data.Msg_cl == "USD/BTC"){
                    $("#left-panel-line1-3").html(data.Amount);
                    $("#left-panel-line1-4").html(data.Msg_cl);
                }}
//==========================================================================
//==========================================================================
                if (data.Msg_target == "SELL"){
                    if (data.Msg_cl == "EUR/BTC"){
                        $("#left-panel-line2-1").html(data.Amount);
                        $("#left-panel-line2-2").html(data.Msg_cl);
                    }}

                if (data.Msg_target == "SELL"){
                    if (data.Msg_cl == "USD/BTC"){
                        $("#left-panel-line2-3").html(data.Amount);
                        $("#left-panel-line2-4").html(data.Msg_cl);
                    }}
//==========================================================================
//==========================================================================
                if (data.Msg_target == "SPOT"){
                    if (data.Msg_cl == "EUR/BTC"){
                        $("#left-panel-line3-1").html(data.Amount);
                        $("#left-panel-line3-2").html(data.Msg_cl);
                    }}

                if (data.Msg_target == "SPOT"){
                    if (data.Msg_cl == "USD/BTC"){
                        $("#left-panel-line3-3").html(data.Amount);
                        $("#left-panel-line3-4").html(data.Msg_cl);
                    }}
//==========================================================================

            break;
        }
    };

    // Send messages.
    var postConecnt = function () {
        var uname = $('#uname').text();
        var content = $('#sendbox').val();
        socket.send(content);
        $('#sendbox').val("");
    }

    $('#sendbtn').click(function () {
        postConecnt();
    });
});