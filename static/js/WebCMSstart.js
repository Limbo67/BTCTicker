
        var full_screen = true;         // Use full screen mode or wrapper


//####################################################################################################################
//####################################################################################################################
/*
$( document ).ready(function() {
    //onLoadResize();
});        
window.addEventListener("load", onLoadResize, false);
*/
//####################################################################################################################
//####################################################################################################################
function onLoadResize () {

    //alert("onLoadResize");

        var topOffset = $("#page_header").outerHeight() + 20;
        var width,scr_height;

        if (full_screen){
                width = (this.window.innerWidth > 0) ? this.window.innerWidth : this.screen.width;
        }else{    
                width = $("#wrapper").outerWidth();
        }        

        if (width < 768) {
            $('div.navbar-collapse').addClass('collapse');
            topOffset = 112; // 2-row-menu
        } else {
            $('div.navbar-collapse').removeClass('collapse');
        }

        
        if (full_screen){
                scr_height = ((this.window.innerHeight > 0) ? this.window.innerHeight : this.screen.height) - 1;
        }else{    
                $("#wrapper").css("height", "100%");  // Must set wrapper height before resize     
                scr_height = $("#wrapper").outerHeight();
        }        

        var height = scr_height - topOffset;

        if (height < 1) height = 1;
        if (height > topOffset) {
            $("#page-wrapper").css("min-height", (height) + "px");
        }



}
//####################################################################################################################
//####################################################################################################################
//Loads the correct sidebar on window load,
//collapses the sidebar on window resize.
// Sets the min-height of #page-wrapper to window size

function onLoadSetBind () {
    $(window).bind("load resize", function() {
        onLoadResize();
    });

    
/*
    var url = window.location;
    var element = $('ul.nav a').filter(function() {
        return this.href == url || url.href.indexOf(this.href) == 0;
    }).addClass('active').parent().parent().addClass('in').parent();
    if (element.is('li')) {
        element.addClass('active');
    }
*/
}
//####################################################################################################################
//####################################################################################################################

function onSetForStart () {

        
        $("#wrapper").css("display", "block");

        //WebCMS.apply_translations(lang);

        WebCMS.on_init();

        

//==================================================================================
}
//####################################################################################################################
//####################################################################################################################
