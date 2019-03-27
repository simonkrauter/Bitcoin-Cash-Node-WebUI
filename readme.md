Bitcoin Cash Node WebUI
=======================

This is a simple web interface based on [CherryPy](https://cherrypy.org/) to monitor a Bitcoin (Cash) node.<br>
It shows:
- General information about the bitcoin node process and connected nodes (retrieved via the JSON-RPC ``bitcoin-cli``)
- Network usage (retrieved from ``/proc/net/netstat``)
- Disk usage

Screenshot
----------

<a href="https://github.com/trustable-code/BitcoinCashNodeWebUI/blob/master/screenshot.png"><img src="https://raw.githubusercontent.com/trustable-code/BitcoinCashNodeWebUI/master/screenshot.png" width="350"></a>

Setup Guide
-----------

1. Install CherryPy

```
apt install python-pip
pip install cherrypy
```

2. Download or clone the repository

3. Edit ``bitcoin-cli.sh``, so that it runs your ``bitcoin-cli`` executable with the right user.

5. Edit ``cherry.py``, so that ``BitcoinDataPath`` points to your bitcoin node data directory.

6. Run ``python cherry.py`` as background process (e.g. per ``screen``)

License
-------

BitcoinCashNodeWebUI is FLOSS (free and open-source software).<br>
All files in this repository are licensed under the [GNU General Public License version 3](https://opensource.org/licenses/GPL-3.0) (GPLv3).<br>
Copyright 2019 Simon Krauter
