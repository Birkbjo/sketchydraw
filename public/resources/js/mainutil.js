	//check();
	var pickedcolor = 'black';
	var pickedsize = 3;
	window.onload=function(){
		var username=getCookie('name');
	//	changename();
	//	document.getElementById('rangesize').value = pickedsize;
	}

	function check(err){
		//alert(getCookie('name'))
		if(getCookie('name')==false || getCookie('room') == false){

			if(err) {
				location.href="..login/login.html?err="+err;
			} else {
				location.href="..login/login.html";
			}
			
		}
	//	
	}
	function changename(){
		var name=document.getElementById('username');
		name.innerHTML='Your name is:'+getCookie('name');
	}

	function getCookie(name) {
		var value = "; " + document.cookie;
		var parts = value.split("; " + name + "=");
		if (parts.length == 2) return parts.pop().split(";").shift();
		else return false;

	}

	function logout(err){
		delete_cookie('name');
		delete_cookie('room');
		delete_cookie('roompass');
		check(err);
	}
	function delete_cookie( name ) {
  		document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  		alert(document.cookie);
	}

	function changeSize(val) {
		pickedsize = val;
		$('#rangesize').val(val);
		//document.getElementById('rangesize').value = val;
		$('#nrSize').val(val);
	}