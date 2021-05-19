const trafficUpdateInterval = 2; // seconds
const shortTermAverageCount = 4;
const chartHeight = 120; // pixel

function byId(id) {
	return document.getElementById(id);
}

function formatFloat(Value, Decimals) {
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

function formatkB(Value) {
	return formatFloat(Value / 1000) + " kB";
}

function formatMB(Value) {
	return formatFloat(Value / 1000000) + " MB";
}

function formatGB(Value) {
	return formatFloat(Value / 1000000000, 1) + " GB";
}

function updateTraffic(WaitTime) {
	var request = new XMLHttpRequest();
	request.open("GET", "traffic_json?WaitTime=" + WaitTime, true);
	request.onreadystatechange = function() {
		if(request.readyState == 4 && request.status == 200)
			ApplyTraffic(JSON.parse(request.responseText));
	};
	request.send();
	setTimeout(function(){ updateTraffic(trafficUpdateInterval); }, trafficUpdateInterval * 1000);

	var offlineDiv = document.getElementById("offline");
	if((new Date()) - lastUpdateDate > trafficUpdateInterval * 1000 * 2)
		offlineDiv.style.display = "";
	else
		offlineDiv.style.display = "none";
}

function refreshData() {
	var request = new XMLHttpRequest();
	request.open("GET", "general_json", true);
	request.onreadystatechange = function() {
		if(request.readyState == 4 && request.status == 200)
			updateUI(JSON.parse(request.responseText));
	};
	request.send();
	setTimeout(function(){ refreshData(); }, 30000);
}


var uploadRatePoints = [];
var downloadRatePoints = [];
var maxDisplayUploadRate = -1;
var maxDisplayDownloadRate = -1;
var lastUpdateDate;

function ApplyTraffic(data) {
	lastUpdateDate = new Date();

	var totalAverageDownloadRate = data.Download / data.Uptime;
	var totalAverageUploadRate = data.Upload / data.Uptime;

	var shortTermAverageUploadRate = calculateAverage(uploadRatePoints, shortTermAverageCount);
	var shortTermAverageDownloadRate = calculateAverage(downloadRatePoints, shortTermAverageCount);

	var longTermAverageUploadRate = calculateAverage(uploadRatePoints, uploadRatePoints.length);
	var longTermAverageDownloadRate = calculateAverage(downloadRatePoints, downloadRatePoints.length);

	uploadRatePoints.push([data.CurrentUpstream, shortTermAverageUploadRate, longTermAverageUploadRate]);
	downloadRatePoints.push([data.CurrentDownstream, shortTermAverageDownloadRate, longTermAverageDownloadRate]);

	// remove old points
	while(uploadRatePoints.length > window.innerWidth - 70) {
		uploadRatePoints.shift();
		downloadRatePoints.shift();
  }

  maxDisplayUploadRate = calculateMaxDisplayRate(maxDisplayUploadRate, totalAverageUploadRate, shortTermAverageUploadRate, longTermAverageUploadRate);
  maxDisplayDownloadRate = calculateMaxDisplayRate(maxDisplayDownloadRate, totalAverageDownloadRate, shortTermAverageDownloadRate, longTermAverageDownloadRate);

	byId("Download").innerHTML = formatGB(data.Download);
	byId("Upload").innerHTML = formatGB(data.Upload);
	byId("AvgDownstream").innerHTML = formatkB(totalAverageDownloadRate) + "/s";
	byId("AvgUpstream").innerHTML = formatkB(totalAverageUploadRate) + "/s";
	byId("CurrentDownstream").innerHTML = formatkB(shortTermAverageDownloadRate) + "/s";
	byId("CurrentUpstream").innerHTML = formatkB(shortTermAverageUploadRate) + "/s";
	byId("UploadRateChartMax").innerHTML = formatkB(maxDisplayUploadRate) + "/s";
	byId("DownloadRateChartMax").innerHTML = formatkB(maxDisplayDownloadRate) + "/s";
	document.title = "(" + formatkB(shortTermAverageUploadRate) + "/s) Bitcoin Node";

	drawTrafficChart("UploadRateChart", uploadRatePoints, maxDisplayUploadRate, "red");
	drawTrafficChart("DownloadRateChart", downloadRatePoints, maxDisplayDownloadRate, "lime");
}

function calculateAverage(dataPoints, maxCount) {
	if(dataPoints.length == 0)
		return 0;
	if(dataPoints.length == 0)
		return 0;
	var i = dataPoints.length - 1;
	var sum = 0;
	var count = 0;
	while(count < maxCount && i >= 0) {
		sum = sum + dataPoints[i][0];
		count++;
		i--;
	}
	return sum / count;
}

function calculateMaxDisplayRate(maxDisplayRate, totalAverageRate, shortTermAverageRate, longTermAverageRate) {
  // compare with total average
  maxDisplayRate = Math.max(maxDisplayRate, totalAverageRate * 1.5);

  // compare short long term average
  maxDisplayRate = Math.max(maxDisplayRate, Math.min(shortTermAverageRate, longTermAverageRate * 3));

  // round
	var x = 1;
	var r = maxDisplayRate;
	while(r >= 8) {
		r = r / 10;
		x = x * 10;
	}
	maxDisplayRate = Math.ceil(maxDisplayRate / x) * x;

  return maxDisplayRate;
}

function drawTrafficChart(canvasId, dataPoints, maxDisplayRate, color) {
	var canvas = document.getElementById(canvasId);
	canvas.height = chartHeight;
	canvas.width = dataPoints.length + 1.5;
	var context = canvas.getContext("2d");
	context.fillStyle = "#070707";
	context.fillRect(0, 0, canvas.width, canvas.height);
	context.lineWidth = 1;

	// short term average
	context.strokeStyle = color;
	for(var i = 0; i < dataPoints.length; i++) {
		var y = dataPoints[i][1] / maxDisplayRate * canvas.height;
		context.beginPath();
		context.moveTo(i + 1.5, canvas.height - y);
		context.lineTo(i + 1.5, canvas.height);
		context.stroke();
	}

	// long term average
	context.strokeStyle = "white";
	for(var i = 0; i < dataPoints.length - 1; i++) {
		var y1 = Math.round(dataPoints[i][2] / maxDisplayRate * canvas.height - 0.5) + 0.5;
		var y2 = Math.round(dataPoints[i + 1][2] / maxDisplayRate * canvas.height - 0.5) + 0.5;
		context.beginPath();
		context.moveTo(i + 1.5, canvas.height - y1);
		context.lineTo(i + 2.5, canvas.height - y2);
		context.stroke();
	}
}

function updatePeers(peers) {
	var tbody = document.getElementById("Peers");
	tbody.innerHTML = "";
	for(var i = 0; i < peers.length; i++) {
		var peer = peers[i];
		var tr = document.createElement("TR");

		var td = document.createElement("TD");
		var a = document.createElement("A");
		var ip = peer.addr.substr(0, peer.addr.indexOf(":"));
		a.href = "http://" + ip;
		a.innerHTML = ip;
		td.appendChild(a);
		tr.appendChild(td);

		td = document.createElement("TD");
		td.innerHTML = peer.subver.substr(1, peer.subver.length - 2);
		tr.appendChild(td);

		tbody.appendChild(tr);
	}
}

function updateUI(data) {
	byId("BlockchainSize").innerHTML = formatGB(data.BlockchainSize) || "";
	byId("DiskFree").innerHTML = formatGB(data.DiskFree) || "";
	byId("Version").innerHTML = data.version || "";
	byId("Blocks").innerHTML = data.blocks || "";
	byId("Connections").innerHTML = data.connections || "";
	byId("Errors").innerHTML = data.warnings;
	byId("Uptime").innerHTML = formatFloat(data.Uptime / 60 / 60 / 24) + " days";

	updatePeers(data.Peers);
}

updateTraffic(1);
refreshData();


