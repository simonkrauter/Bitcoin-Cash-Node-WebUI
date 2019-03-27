import os
import cherrypy
import time
import subprocess
import json
import math

BitcoinDataPath = '/home/bitcoin/.bitcoin/'
BitcoinCLIPath = '/home/bitcoin/bitcoin-cli.sh'

def executeCmd(command):
  p = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
  return p.stdout.read()


def getUptime():
  t = executeCmd(['cat', '/proc/uptime'])
  words = t.split()
  if len(words) < 2:
    return -1
  return float(words[0])


def getDirSize(dir):
  t = executeCmd(['du', dir, '-b'])
  lines = t.splitlines()
  if len(lines) < 1:
    return -1
  line = lines[-1]
  i = line.find('\t')
  if i < 1:
    return -1
  return int(line[0:i])


def getDiskFree(dir):
  t = executeCmd(['df', dir, '-B1'])
  lines = t.splitlines()
  if len(lines) < 1:
    return -1
  line = lines[-1]
  words = line.split()
  if len(words) < 4:
    return -1
  return int(words[3])


# /proc/net/netstat = all traffic from network interface since boot
# good to determine transfer speed
def getTraffic():
  t = executeCmd(['cat', '/proc/net/netstat'])
  lines = t.splitlines()
  if len(lines) < 1:
    return -1
  line = lines[-1]
  words = line.split()
  if len(words) < 9:
    return -1
  DownloadBytes = int(words[7])
  UploadBytes = int(words[8])
  return [DownloadBytes, UploadBytes]


# getnettotals = traffic of bitcoind since start
# not good to determine transfer speed
def getTraffic_2():
  data = json.loads(executeCmd([BitcoinCLIPath, 'getnettotals']))
  return [data['totalbytesrecv'], data['totalbytessent']]


class MyWebServer(object):

  @cherrypy.expose
  def index(self):
    f = open('index.html')
    return f.read()

  @cherrypy.expose
  def traffic_json(self, WaitTime):
    wait = float(WaitTime)
    Traffic = getTraffic()
    DownloadBytes1 = Traffic[0]
    UploadBytes1 = Traffic[1]
    time.sleep(wait)
    Traffic = getTraffic()
    DownloadBytes2 = Traffic[0]
    UploadBytes2 = Traffic[1]
    Downstream = int((DownloadBytes2 - DownloadBytes1) / wait)
    Upstream = int((UploadBytes2 - UploadBytes1) / wait)
    data = {'CurrentDownstream': Downstream, 'CurrentUpstream': Upstream, 'Uptime': getUptime(), 'Download': DownloadBytes2, 'Upload': UploadBytes2}
    return json.dumps(data)

  @cherrypy.expose
  def general_json(self):
    getinfo = executeCmd([BitcoinCLIPath, 'getinfo'])
    data = {}
    if getinfo == '':
      data['errors'] = 'bitcoind is not running or not yet ready'
    else:
      data = json.loads(getinfo)
    data['Uptime'] = getUptime()
    data['BlockchainSize'] = getDirSize(BitcoinDataPath)
    data['DiskFree'] = getDiskFree(BitcoinDataPath)
    data['Peers'] = json.loads(executeCmd([BitcoinCLIPath, 'getpeerinfo']))
    return json.dumps(data)

  index.exposed = True

cherrypy.config.update({
    'server.socket_host' : '0.0.0.0',
    'server.socket_port' : 81,
  })

conf = {
  '/': {
    'tools.staticdir.on': True,
    'tools.staticdir.dir': os.path.abspath(os.getcwd())
  }
}

cherrypy.quickstart(MyWebServer(), '/', conf)


