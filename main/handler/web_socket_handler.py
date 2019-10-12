import tornado.websocket
import json
import ws4py

from main.common.common import *

logger = logger(__name__)

class WebSocketHandler(tornado.websocket.WebSocketHandler):

    STATE_CREATED           = 0
    STATE_CONNECTED         = 1
    STATE_INITIALIZED       = 2
    STATE_PROCESSING        = 3
    STATE_EOS_RECEIVED      = 7
    STATE_CANCELLING        = 8
    STATE_FINISHED          = 100

    def check_origin(self, origin):
        return 1

    def opened(self):
        self.state = self.STATE_CONNECTED
        self.last_partial_result = ""

    def on_message(self, message):
        if self.state == self.__class__.STATE_CONNECTED:
            props = json.loads(str(message))

            logger.debug('----------------> Conntected')
            logger.debug(props)

            self.state = self.STATE_INITIALIZED
        elif message.data == "EOS":
            if self.state != self.STATE_CANCELLING and self.state != self.STATE_EOS_RECEIVED and self.state != self.STATE_FINISHED:

                self.state = self.STATE_EOS_RECEIVED
            else:
                logger.info("%s: Ignoring EOS, worker already in state %d" % (self.request_id, self.state))
        else:
            if self.state != self.STATE_CANCELLING and self.state != self.STATE_EOS_RECEIVED and self.state != self.STATE_FINISHED:
                if isinstance(message, ws4py.messaging.BinaryMessage):
                    self.decoder_pipeline.process_data(message.data)
                    self.state = self.STATE_PROCESSING

                elif isinstance(message, ws4py.messaging.TextMessage):
                    props = json.loads(str(message))

                    logger.debug(props)

            else:
                logger.info("%s: Ignoring data, worker already in state %d" % (self.request_id, self.state))

    def on_close(self):
        print("WebSocket closed")
