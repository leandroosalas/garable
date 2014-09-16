var util = require('util');
var config = require('./config'),
async = require('async'),
gpio = require('pi-gpio');

var bleno = require('bleno');

var BlenoPrimaryService = bleno.PrimaryService;
var BlenoCharacteristic = bleno.Characteristic;
var BlenoDescriptor = bleno.Descriptor;

console.log('bleno');

//Control Point Characteristic
var GarableControlPointCharacteristic = function() {
  GarableControlPointCharacteristic.super_.call(this, {
    uuid: '37193b60-173a-11e4-8fd1-0002a5d5c51b',
    properties: ['write', 'writeWithoutResponse']
  });
};

util.inherits(GarableControlPointCharacteristic, BlenoCharacteristic);

//Listen write event on our characteristic and open the garage
GarableControlPointCharacteristic.prototype.onWriteRequest = function(data, offset, withoutResponse, callback) {
  console.log('GarableControlPointCharacteristic write request: ' + data.toString('hex') + ' ' + offset + ' ' + withoutResponse);

  openGarage();
  
  callback(this.RESULT_SUCCESS);
};


//Garage Service
// in this code, we setup the service and add characteristics
function GarableService() {
  GarableService.super_.call(this, {
    uuid: '13e3b8e0-22df-11e4-8c21-0800200c9a66',
    characteristics: [
      new GarableControlPointCharacteristic(),
    ]
  });
}

util.inherits(GarableService, BlenoPrimaryService);

//monitoring teh status of bluetooth and start to advertising
bleno.on('stateChange', function(state) {
  console.log('on -> stateChange: ' + state);

  if (state === 'poweredOn') {
    bleno.startAdvertising('Garable', ['13e3b8e0-22df-11e4-8c21-0800200c9a66']);
  } else {
    bleno.stopAdvertising();
  }
});

// Linux only events /////////////////
bleno.on('accept', function(clientAddress) {
  console.log('on -> accept, client: ' + clientAddress);

  bleno.updateRssi();
});

bleno.on('disconnect', function(clientAddress) {
  console.log('on -> disconnect, client: ' + clientAddress);
});

bleno.on('rssiUpdate', function(rssi) {
  console.log('on -> rssiUpdate: ' + rssi);
});
//////////////////////////////////////


//Magic starts here
bleno.on('advertisingStart', function(error) {
  console.log('on -> advertisingStart: ' + (error ? 'error ' + error : 'success'));

  if (!error) {
    bleno.setServices([
      new GarableService()
    ]);
  }
});

bleno.on('advertisingStop', function() {
  console.log('on -> advertisingStop');
});

bleno.on('servicesSet', function() {
  console.log('on -> servicesSet');
});
//and finish here

//garage code
function delayPinWrite(pin, value, callback) {
  setTimeout(function() {
    gpio.write(pin, value, callback);
  }, config.RELAY_TIMEOUT);
}

// function to open the garage sending GPIO signals to the RELE
function openGarage(){

  async.series([
    function(callback) {
      // Open pin for output
      gpio.open(config.LEFT_GARAGE_PIN, "output", callback);
    },
    function(callback) {
      // Turn the relay on
      gpio.write(config.LEFT_GARAGE_PIN, config.RELAY_ON, callback);
    },
    function(callback) {
      // Turn the relay off after delay to simulate button press
      delayPinWrite(config.LEFT_GARAGE_PIN, config.RELAY_OFF, callback);
    },
    function(err, results) {
      setTimeout(function() {
        // Close pin from further writing
        gpio.close(config.LEFT_GARAGE_PIN);
        // Return json
        //res.json("ok");
      }, config.RELAY_TIMEOUT);
    }
  ]);

}
//end of garage code

