// app.js
var express = require('express');  
var app = express();  
var server = require('http').createServer(app);  
var io = require('socket.io')(server);
var serialport = require('serialport');
var SerialPort = serialport.SerialPort;

var port = new SerialPort('/dev/ttyACM0',{
   baudRate:9600,
   parser: serialport.parsers.readline('\r\n')
});

var DataArduino = "";
var led_state = "LOW";
var ventilacion = "LOW";
var iluminacion = "LOW";
//var State = "Growth";
var tipo_iluminacion = "Automatico";
var tipo_ventilacion = "Automatico";
var State = "Blooming";
var receivedData = "";
var DataString = "";
var temperatura, humedad, LDR_inferior, LDR_superior, pH, ventilador_derecho, ventilador_izquierdo = 0;

port.on('open', function(){
    console.log('Serial Port Opend');
});

port.on('data', function(data){
    DataArduino = DataArduino + data;
    var posicion = DataArduino.lastIndexOf('*');
    console.log("Posicion "+posicion);
    if(posicion > 0){
        console.log(DataArduino.substring(0, posicion));
        Controlador(DataArduino.substring(0, posicion));
        DataArduino = DataArduino.substring(posicion+1)
    }
});

port.on('close', function(){
    console.log("puerto cerrado... reconectando");
    port = new SerialPort('/dev/ttyACM0');
});


app.use(express.static(__dirname + '/node_modules'));  
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res,next) {  
    res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', function(socket) {  
    var socketId = socket.id;
    var clientIp = socket.request.connection.remoteAddress;

    console.log('Cliente ip '+clientIp);
    console.log('connection :', socket.request.connection._peername);

    socket.on('door', function(data){
      if(data == 'open'){
        console.log("Abrir puerta");
        port.write("*Door*OFF-");
      }else if(data == 'close'){
        console.log("Cerrar puerta");
        port.write("*Door*ON-");
      }
    });
    socket.on('tipo_iluminacion', function(data){
       tipo_iluminacion = data;
    });
    socket.on('iluminacion', function(data){
      if(tipo_iluminacion == "Manual"){
        Panel_led(data, State);
      }
    });
    socket.on('tipo_ventilacion', function(data){
       tipo_ventilacion = data;
    });
    socket.on('ventilacion', function(data){
      if(tipo_ventilacion == "Manual"){
        Sistema_ventilacion(data);
      }
    });

});

server.listen(4200);  

function Controlador(data){
    var receivedData = data.toString();
    var Data = receivedData.split("-");
    dataSize = Data.length;
    console.log(Data);
    temperatura = Data[0];
    humedad = Data[1];
    pH = Data[2];
    LDR_inferior = Data[3];
    LDR_superior = Data[4];
    ventilador_derecho = Data[5];
    ventilador_izquierdo = Data[6];
    puerta = Data[7];
    io.sockets.emit('temperatura', temperatura);
    io.sockets.emit('humedad',  humedad);
    io.sockets.emit('pH', pH);
    io.sockets.emit('LDR_inferior', LDR_inferior);
    io.sockets.emit('LDR_superior',  LDR_superior);
    io.sockets.emit('ventilador_derecho',ventilador_derecho);
    io.sockets.emit('ventilador_izquierdo', ventilador_izquierdo);
    io.sockets.emit('puerta ', puerta);

}
setInterval(function() {
  var date = new Date();
  var current_hour = date.getHours();
  var current_minute = date.getMinutes();
  console.log("Hora: "+current_hour+"minuto = " + current_minute);
  console.log("LDR sup => "+LDR_superior);

  if(tipo_iluminacion == "Automatico" && LDR_superior > 500 && (current_hour >= 16 && current_hour < 19)){

    led_state = "LOW";
     console.log("LED STATE LOW");
    Panel_led(led_state, State);
  }else if(tipo_iluminacion == "Automatico" && LDR_superior < 100 && (current_hour < 16 ||  current_hour >= 19)) {
    led_state = "HIGH";
    console.log("LED STATE HIGH");
    Panel_led(led_state, State);
  }

  if(tipo_ventilacion == "Automatico" && ventilador_derecho == "0" && (((current_minute >= 0 && current_minute < 15) || (current_minute >= 30 && current_minute < 45)) || temperatura >= 30)){
    ventilacion = "HIGH";
    console.log("Ventilador HIGH");
    Sistema_ventilacion(ventilacion);
  }else if(tipo_ventilacion == "Automatico" && ventilador_derecho == "1" && ((current_minute >= 15 && current_minute < 30) || (current_minute >= 45 && current_minute < 60))){ 
    ventilacion = "LOW";
     console.log("Ventilador LOW");
    Sistema_ventilacion(ventilacion);
  }



}, 3000);

function Panel_led(led, State){

  port.write("*"+State+"*");
  port.write(led);
  port.write("-");
  console.log("*"+led+"-");
}

function Sistema_ventilacion(ventilacion){
  port.write("*Ventilacion*");
  port.write(ventilacion);
  port.write("-");

}

