import tornado.escape
import tornado.ioloop
import tornado.options
import tornado.web
import tornado.websocket

from main.common.common import *

class Application(tornado.web.Application):

    def __init__(self):
        handlers = [
            (r"/", MainHandler)
        ]

        settings = dict(
            cookie_secret="AAAA",
            template_path=os.path.join(os.path.dirname(__file__), get_file_path("web/view")),
            static_path=os.path.join(os.path.dirname(__file__), get_file_path("web/resource")),
            xsrf_cookies=True,
        )
        super(Application, self).__init__(handlers, **settings)

class MainHandler(tornado.web.RequestHandler):

    def get(self):
        self.render("index.html")

def main():
    AppContext()

    app = Application()
    app.listen(conf('server:port'))

    tornado.ioloop.IOLoop.current().start()


if __name__ == "__main__":
    main()
