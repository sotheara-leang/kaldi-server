import tornado.escape
import tornado.ioloop
import tornado.options
import tornado.web
import tornado.websocket

from main.handler.main_handler import *
from main.handler.rest_handler import *
from main.handler.web_socket_handler import *

class Application(tornado.web.Application):

    def __init__(self):
        handlers = [
            (r"/", MainHandler),
            (r"/api/decode", RestHandler),
            (r"/ws/decode", WebSocketHandler),
            (r'/static/(.*)', tornado.web.StaticFileHandler, {'path': file_path('main/web/resource')})
        ]

        settings = dict(
            template_path=os.path.join(os.path.dirname(__file__), file_path("main/web/view")),
            static_path=os.path.join(os.path.dirname(__file__), file_path("main/web/resource")),
            xsrf_cookies=False,
            debug=True
        )
        super(Application, self).__init__(handlers, **settings)

def main():
    AppContext()

    app = Application()
    app.listen(conf('server-port'))

    tornado.ioloop.IOLoop.current().start()


if __name__ == "__main__":
    main()
