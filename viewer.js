var token, userId,channelId,uniqKey;
var loggedin = false
// so we don't have to write this out everytime #efficency
const twitch = window.Twitch.ext;
const monthInSeconds = 2592000000, weekInSeconds = 604800;

// callback called when context of an extension is fired 
twitch.onContext((context) => {
  //console.log(context);
});


// onAuthorized callback called each time JWT is fired


$(function () {
  twitch.onAuthorized((auth) => {
  // twitch.rig.log(JSON.stringify(auth))
  token = auth.token; //JWT passed to backend for authentication 
  userId = auth.userId; //opaque userID 
  channelId=auth.channelId //channel id (on which extension works)
  uniqKey=channelId+'-'+userId
  start()
  if (userId[0] === 'A') {//logged out
    $('.loggedout').show();
  } else {  //else logged in
    loggedin = true;
    $('.loggedin').css('display', 'flex');
  }
});
  // twitch.rig.log('token is ',token,' userid is', userId)
  const DELAY = 60000 //1 min
  function allowReview() {
    $('#txtarea').removeAttr('disabled')
    $('#txtarea').attr('placeholder', '100 character maximum');
  }
  function checkTimer() {  //При загрузке страницы смотрю, можно ли отправлять ревью
    let now = new Date()
    let storageInfo = window.localStorage.getItem(uniqKey)
    let nextRev = new Date(storageInfo) //Сразу считаю дату следующего отзыва

    if (nextRev !== null && now < nextRev) {
      let timeToShow=nextRev.toISOString().split('T')
      timeToShow[1]=timeToShow[1].slice(0,9)
      $('#txtarea').attr('placeholder', 'Следующий отзыв: ' +timeToShow[0]+' в '+timeToShow[1]);
      $('#txtarea').attr('disabled', '')
      setTimeout(allowReview, nextRev - now)
    }
  }
  function addTicket(content, id, name = 'You') {  //Добавление тикета со всеми вытекающими
    $('#ticketlist').animate({ scrollTop: 0 }, 500)
    let el = $('<div class="ticket"><span>' + content + '</span></div>').hide()
    if (id === userId)
      name = 'You'
    el.attr('data-name', name)
    $('#ticketlist').prepend(el)
    el.show('slow');
  }
  function updateInfo() {   //Обновление списка
    twitch.rig.log('updating info')
    $.ajax({
      type: "GET",
      url: location.protocol + "//localhost:3000/get",
      success: function (response) { //сразу распаковывает json
        //twitch.rig.log(typeof response)
        //response.parse.foreach (zzZZzzz)
        $('#ticketlist').empty();
        response.forEach(el => {
          addTicket(el.review, el.userID, el.userName)
        });
      },
      error: function (xhr, status, err) {
        twitch.rig.log('error')
        setTimeout(updateInfo, 10000)
      }
    });
  }
  /* #region  после загрузки страницы */
  function start(){ //Начало исполнения
    console.log(uniqKey)
    if(uniqKey===undefined){
      //setTimeout(start(),2000)//Раз в секунду ждем JWT авторизации
    }else{
      if(window.localStorage.getItem(uniqKey)===null){
        console.log('something')
        window.localStorage.setItem(uniqKey,new Date())
      }
      checkTimer()
      updateInfo()
      let interval = setInterval(updateInfo, DELAY)
    }  
  }
  /* #endregion */
  $('#btn').click(function (e) {  //нажата кнопка окей
    e.preventDefault()
    if ($('#txtarea').val() !== '' && loggedin) {

      let now = new Date()
      let storageInfo = window.localStorage.getItem(uniqKey) //Считываю дату следующего ревью
      let nextRev = new Date(storageInfo) //Сразу  дату следующего отзыва

      twitch.rig.log(now, nextRev, now < nextRev)
      if (nextRev !== null && now >= nextRev) {
        nextRev.setDate(now.getDate() + 7)//7 - неделя кд на отзыв. Если буду менять - тут поменять
        let timeToShow=nextRev.toISOString().split('T')
        timeToShow[1]=timeToShow[1].slice(0,9)
        $('#txtarea').attr('placeholder', 'Следующий отзыв: ' +timeToShow[0]+' в '+timeToShow[1]);
        $('#txtarea').attr('disabled', '')
        twitch.rig.log(nextRev.toString())
        window.localStorage.setItem(uniqKey, nextRev)
        setTimeout(allowReview, nextRev - now)

        let rev = $('#txtarea').val()
        console.log('sent for no reason')
        $.ajax({
          type: "POST",
          url: location.protocol + "//localhost:3000/add",
          data: JSON.stringify({ review: rev }),
          contentType: 'application/json',
          headers: { "Authorization": 'Bearer ' + token }
        });
        addTicket(rev, userId)
        $('#txtarea').val('')
      }
    }
  })
})