import logging
import os

from singleton_decorator import singleton

from main.common.configuration import Configuration
from main.common.logger import Logger

ctx = globals()

@singleton
class AppContext(object):

    def __init__(self):
        self.conf = Configuration(file_path('conf/config.yml'))

        if self.conf.get('logging-enable') is True:
            Logger(file_path('conf/logging.yml'))
        else:
            logging.basicConfig(level=logging.DEBUG)

        ctx['conf'] = self.conf

def logger(name):
    return logging.getLogger(name)

def conf(key=None, default=None):
    if key is None:
        return ctx['conf']
    return ctx['conf'].get(key, default)

def proj_dir():
    return os.environ['KALDI_SRV_HOME']

def file_path(file: str):
    return os.path.join(proj_dir(), file)

def tmp_dir():
    return proj_dir() + '/tmp'
