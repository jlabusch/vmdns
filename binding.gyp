{
    "targets": [{
        "target_name": "avahi_resolver",
        "sources": ["src/avahi_resolver.cpp"],
        "libraries": [
            "-ldns_sd",
            "-lavahi-client",
            "-lavahi-common"
        ],
        "conditions": [
            ["OS=='linux'", { "defines": ["AVAHI_ENABLED"] }]
        ]
    }]
}
