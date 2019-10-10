from main.domain.code import *

class Response(object):

    def __init__(self, status, data):
        self.status = status
        self.data = data

    @staticmethod
    def ok(data=None):
        return Response(ST_SUCCESS, data)

    @staticmethod
    def fail(data=None):
        return Response(ST_SYS_ERROR, data)

    @staticmethod
    def invalid(data=None):
        return Response(ST_DATA_INVALID, data)
