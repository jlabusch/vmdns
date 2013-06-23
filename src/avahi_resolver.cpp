#define BUILDING_NODE_EXTENSION
#include <node.h>

extern "C"{
    #include <avahi-common/simple-watch.h>
    #include <avahi-common/error.h>
    #include <avahi-common/malloc.h>
    #include <avahi-common/domain.h>
    #include <avahi-common/llist.h>
    #include <avahi-client/client.h>
    #include <avahi-client/lookup.h>
}
#include <cassert>
#include <cstdio>

using namespace v8;

namespace {
    AvahiSimplePoll *simple_poll = NULL;
    AvahiClient *client = NULL;
    Handle<Function> callback;

#ifdef AVAHI_ENABLED
    void host_name_resolver_callback(AvahiHostNameResolver *r,
                                     AVAHI_GCC_UNUSED AvahiIfIndex interfaceIndex,
                                     AVAHI_GCC_UNUSED AvahiProtocol protocol,
                                     AvahiResolverEvent event,
                                     const char *name,
                                     const AvahiAddress *a,
                                     AVAHI_GCC_UNUSED AvahiLookupResultFlags flags,
                                     AVAHI_GCC_UNUSED void *userdata)
    {
        assert(r);
        const size_t argc = 3;
        Local<Value> argv[argc];
        switch (event) {
            case AVAHI_RESOLVER_FOUND: {
                char address[AVAHI_ADDRESS_STR_MAX];
                avahi_address_snprint(address, sizeof(address), a);
                argv[0] = Local<Value>::New(Null());
                argv[1] = Local<Value>::New(String::New(name));
                argv[2] = Local<Value>::New(String::New(address));
                break;
            }
            case AVAHI_RESOLVER_FAILURE:
                argv[0] = Local<Value>::New(String::New(avahi_strerror(avahi_client_errno(client))));
                argv[1] = Local<Value>::New(Null());
                argv[2] = Local<Value>::New(Null());
                break;
        }
        avahi_host_name_resolver_free(r);
        // TODO: should client be freed as well?
        avahi_simple_poll_quit(simple_poll);
        callback->Call(Context::GetCurrent()->Global(), argc, argv);
    }

    void client_callback(AvahiClient *c,
                         AvahiClientState state,
                         AVAHI_GCC_UNUSED void* userdata)
    {
        switch (state) {
            case AVAHI_CLIENT_FAILURE:{
                const size_t argc = 3;
                Local<Value> argv[argc];
                argv[0] = Local<Value>::New(String::New(avahi_strerror(avahi_client_errno(c))));
                argv[1] = Local<Value>::New(Null());
                argv[2] = Local<Value>::New(Null());
                avahi_simple_poll_quit(simple_poll);
                callback->Call(Context::GetCurrent()->Global(), argc, argv);
                break;
            }
            case AVAHI_CLIENT_S_REGISTERING:
            case AVAHI_CLIENT_S_RUNNING:
            case AVAHI_CLIENT_S_COLLISION:
            case AVAHI_CLIENT_CONNECTING:
                ;
        }
    }

    bool avahi_resolver(const char* hostname){
        simple_poll = avahi_simple_poll_new();
        if (!simple_poll) {
            return false;
        }

        int error = 0;
        client = avahi_client_new(avahi_simple_poll_get(simple_poll), AvahiClientFlags(0), client_callback, NULL, &error);
        if (!client) {
            return false;
        }
        // TODO: check error ^^

        if (!(avahi_host_name_resolver_new(client, AVAHI_IF_UNSPEC, AVAHI_PROTO_UNSPEC, hostname, /*TODO*/AVAHI_PROTO_INET, AvahiLookupFlags(0), host_name_resolver_callback, NULL))) {
            return false;
        }

        avahi_simple_poll_loop(simple_poll);
        return true;
    }
#endif
}

Handle<Value> Resolve(const Arguments& args) {
    HandleScope scope;

    if (args.Length() != 2){
        ThrowException(Exception::TypeError(String::New("avahi-resolver requires exactly two arguments")));
        return scope.Close(Undefined());
    }

    if (!args[0]->IsString()){
        ThrowException(Exception::TypeError(String::New("avahi-resolver hostname must be a string")));
        return scope.Close(Undefined());
    }
    String::Utf8Value hostname(args[0]->ToString());

    if (!args[1]->IsFunction()){
        ThrowException(Exception::TypeError(String::New("avahi-resolver callback must be a function")));
        return scope.Close(Undefined());
    }
    callback = Local<Function>::Cast(args[1]);

#ifdef AVAHI_ENABLED
    if (!avahi_resolver(*hostname)){
        ThrowException(Exception::TypeError(String::New("avahi-resolver couldn't launch Avahi client operation")));
        return scope.Close(Undefined());
    }
#else
    const size_t argc = 3;
    Local<Value> argv[argc];
    argv[0] = Local<Value>::New(String::New("Avahi is not enabled - disabled by node-gyp because OS!=linux");
    argv[1] = Local<Value>::New(Null());
    argv[2] = Local<Value>::New(Null());
    callback->Call(Context::GetCurrent()->Global(), argc, argv);
#endif

    return scope.Close(Undefined());
}

void Init(Handle<Object> exports, Handle<Object> module) {
    module->Set(
        String::NewSymbol("exports"),
        FunctionTemplate::New(Resolve)->GetFunction()
    );
}

NODE_MODULE(avahi_resolver, Init)

