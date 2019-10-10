import logging
import os

from singleton_decorator import singleton

from main.common.configuration import Configuration
from main.common.logger import Logger

ctx = globals()

@singleton
class AppContext(object):

    def __init__(self):
        self.conf = Configuration(get_file_path('conf/config.yml'))

        if self.conf.get('logging:enable') is True:
            Logger(get_file_path('conf/logging.yml'))
        else:
            logging.basicConfig(level=logging.DEBUG)

        ctx['conf'] = self.conf

def logger(self):
    return logging.getLogger(self.__class__.__name__)

def conf(key=None, default=None):
    if key is None:
        return ctx['conf']
    return ctx['conf'].get(key, default)

def get_proj_dir():
    return os.environ['KALDI_SRV_HOME']

def get_file_path(file: str):
    return os.path.join(get_proj_dir(), file)
