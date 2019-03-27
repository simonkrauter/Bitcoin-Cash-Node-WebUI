var TrafficUpdateInterval = 2; // seconds
var DisplayAveragePoints = 3;
var ChartHeight = 120; // pixel

function ByID(id) {
	return document.getElementById(id);
}

function FormatFloat(Value, Decimals) {
	if(!Decimals)
	{
		if(Value < 10)
			Decimals = 1;
		else
			Decimals = 0;
	}
	var x = Math.pow(10, Decimals);
	return (Math.round(Value * x) / x);
}

function FormatkB(Value) {
	return FormatFloat(Value / 1000) + ' kB';
}

function FormatMB(Value) {
	return FormatFloat(Value / 1000000) + ' MB';
}

function FormatGB(Value) {
	return FormatFloat(Value / 1000000000, 1) + ' GB';
}

function UpdateTraffic(WaitTime) {
	var Request = new XMLHttpRequest();
	Request.open('GET', 'traffic_json?WaitTime=' + WaitTime, true);
	Request.onreadystatechange = function() {
		if(Request.readyState == 4 && Request.status == 200)
			ApplyTraffic(JSON.parse(Request.responseText));
	}
	Request.send();
	setTimeout(function(){ UpdateTraffic(TrafficUpdateInterval); }, TrafficUpdateInterval * 1000);
	
	var OfflineDiv = document.getElementById('offline');
	if((new Date()) - LastUpdateDate > TrafficUpdateInterval * 1000 * 2)
		OfflineDiv.style.display = '';
	else
		OfflineDiv.style.display = 'none';
}

function UpdateGeneral() {
	var Request = new XMLHttpRequest();
	Request.open('GET', 'general_json', true);
	Request.onreadystatechange = function() {
		if(Request.readyState == 4 && Request.status == 200)
			ApplyGeneral(JSON.parse(Request.responseText));
	}
	Request.send();
	setTimeout(function(){ UpdateGeneral(); }, 30000);
}


var UploadRates = [];
var DownloadRates = [];
var MaxUploadRate = -1;
var MaxDownloadRate = -1;
var LastUpdateDate;
var AvgRateMaxFactor = 1.5;

function ApplyTraffic(data) {	
	LastUpdateDate = new Date();
	
	var AvgDownstream = data.Download / data.Uptime
	var AvgUpstream = data.Upload / data.Uptime
		
	if(MaxUploadRate < AvgUpstream * AvgRateMaxFactor)
		MaxUploadRate = AvgUpstream * AvgRateMaxFactor;
	if(MaxDownloadRate < AvgDownstream * AvgRateMaxFactor)
		MaxDownloadRate = AvgDownstream * AvgRateMaxFactor;

	var DisplayUploadRate = GetNewDisplayValue(UploadRates);
	var DisplayDownloadRate = GetNewDisplayValue(DownloadRates);
	
	UploadRates.push([data.CurrentUpstream, DisplayUploadRate, GetAvg(UploadRates)]);
	DownloadRates.push([data.CurrentDownstream, DisplayDownloadRate, GetAvg(DownloadRates)]);
	
	var MaxChartWidth = window.innerWidth - 10 - 60;
	while(UploadRates.length > MaxChartWidth)
		UploadRates.shift();
	while(DownloadRates.length > MaxChartWidth)
		DownloadRates.shift();
	
	MaxUploadRate = Math.max(MaxUploadRate, DisplayUploadRate);
	MaxDownloadRate = Math.max(MaxDownloadRate, DisplayDownloadRate);

	MaxUploadRate = RoundMaxRate(MaxUploadRate);
	MaxDownloadRate = RoundMaxRate(MaxDownloadRate);
						
	ByID('Download').innerHTML = FormatGB(data.Download);
	ByID('Upload').innerHTML = FormatGB(data.Upload);
	ByID('AvgDownstream').innerHTML = FormatkB(AvgDownstream) + '/s';
	ByID('AvgUpstream').innerHTML = FormatkB(AvgUpstream) + '/s';
	ByID('CurrentDownstream').innerHTML = FormatkB(DisplayDownloadRate) + '/s';
	ByID('CurrentUpstream').innerHTML = FormatkB(DisplayUploadRate) + '/s';
	ByID('UploadRateChartMax').innerHTML = FormatkB(MaxUploadRate) + '/s';
	ByID('DownloadRateChartMax').innerHTML = FormatkB(MaxDownloadRate) + '/s';
	document.title = '(' + FormatkB(DisplayUploadRate) + '/s) Bitcoin Node';
		
	AddPointToChart('UploadRateChart', UploadRates, MaxUploadRate, 'red');
	AddPointToChart('DownloadRateChart', DownloadRates, MaxDownloadRate, 'lime');
}

function RoundMaxRate(MaxRate) {
	var x = 1;
	var r = MaxRate;
	while(r >= 8) {
		r = r / 10;
		x = x * 10;
	}
	return Math.ceil(MaxRate / x) * x;
}

function GetAvg(DataPoints) {
	if(DataPoints.length == 0)
		return 0;
	var Sum = 0
	for(var i = 0; i < DataPoints.length; i++) {
		Sum = Sum + DataPoints[i][0];
	}
	return Sum / DataPoints.length;
}

function AddPointToChart(CanvasID, DataPoints, MaxRate, Color) {	
	var Canvas = document.getElementById(CanvasID);
	Canvas.height = ChartHeight;
	Canvas.width = DataPoints.length + 1.5;
	var Context = Canvas.getContext('2d');
	Context.fillStyle = '#070707'; 
	Context.fillRect(0, 0, Canvas.width, Canvas.height);
	Context.lineWidth = 1;
	
	// Current:
	Context.strokeStyle = Color;
	for(var i = 0; i < DataPoints.length; i++) {
		var y = DataPoints[i][1] / MaxRate * Canvas.height;
		Context.beginPath();
		Context.moveTo(i + 1.5, Canvas.height - y);
		Context.lineTo(i + 1.5, Canvas.height);
		Context.stroke();
	}
	
	// Avg:
	Context.strokeStyle = 'white';
	for(var i = 0; i < DataPoints.length - 1; i++) {
		var y1 = Math.round(DataPoints[i][2] / MaxRate * Canvas.height - 0.5) + 0.5;
		var y2 = Math.round(DataPoints[i + 1][2] / MaxRate * Canvas.height - 0.5) + 0.5;
		Context.beginPath();
		Context.moveTo(i + 1.5, Canvas.height - y1);
		Context.lineTo(i + 2.5, Canvas.height - y2);
		Context.stroke();
	}	
}

function GetNewDisplayValue(DataPoints) {	
	if(DataPoints.length == 0)
		return 0;
	var i = DataPoints.length - 1;
	var AvgSum = 0;
	var AvgCount = 0;
	while(AvgCount < DisplayAveragePoints && i >= 0) {
		AvgSum = AvgSum + DataPoints[i][0];
		AvgCount++;
		i--;
	}
	return AvgSum / AvgCount;
}

function ApplyPeers(peers) {
	var tbody = document.getElementById('Peers');	
	tbody.innerHTML = '';
	for(var i = 0; i < peers.length; i++) {
		var peer = peers[i];
		var tr = document.createElement('TR');
		
		var td = document.createElement('TD');
		var a = document.createElement('A');
		var ip = peer.addr.substr(0, peer.addr.indexOf(':'));
		a.href = 'http://' + ip;
		a.innerHTML = ip;
		td.appendChild(a);
		tr.appendChild(td);
		
		td = document.createElement('TD');
		td.innerHTML = peer.subver.substr(1, peer.subver.length - 2);
		tr.appendChild(td);
		
		tbody.appendChild(tr);
	}
}
	
function ApplyGeneral(data) {	
	ByID('BlockchainSize').innerHTML = FormatGB(data.BlockchainSize) || '';
	ByID('DiskFree').innerHTML = FormatGB(data.DiskFree) || '';
	ByID('Version').innerHTML = data.version || '';
	ByID('Blocks').innerHTML = data.blocks || '';
	ByID('Connections').innerHTML = data.connections || '';
	ByID('Errors').innerHTML = data.errors;
	ByID('Uptime').innerHTML = FormatFloat(data.Uptime / 60 / 60 / 24) + ' days';
	
	ApplyPeers(data.Peers);
}

UpdateTraffic(1);
UpdateGeneral();


