```java
package com.example.swarm;

import org.glassfish.grizzly.http.server.HttpServer;
import org.glassfish.jersey.grizzly2.httpserver.GrizzlyHttpServerFactory;
import org.glassfish.jersey.server.Server;
import org.glassfish.jersey.server.ResourceConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.concurrent.*;

public class SwarmSignaler {
    private static final Logger logger = LoggerFactory.getLogger(SwarmSigna[34D[K
LoggerFactory.getLogger(SwarmSignaler.class);
    private static final int NODE_COUNT = 18;

    public static void main(String[] args) throws UnknownHostException, IOE[3D[K
IOException {
        List<InetAddress> peers = new ArrayList<>();
        Random random = new Random();
        for (int i = 0; i < NODE_COUNT; i++) {
            String ip = "192.168.1." + (i % 255);
            int port = 5000 + random.nextInt(10000);
            InetAddress peer = InetAddress.getByName(ip + ":" + port);
            peers.add(peer);
        }

        // Create a new P2P DHT
        DHT dht = new DHT(peers);

        // Initialize the node ID
        String nodeId = "node-" + UUID.randomUUID().toString();

        // Start a new HTTP server
        ResourceConfig rc = new ResourceConfig();
        rc.packages(true, "com.example.swarm");
        Server server = GrizzlyHttpServerFactory.createHttpServer(InetAddre[51D[K
GrizzlyHttpServerFactory.createHttpServer(InetAddress.getByName("localhost"GrizzlyHttpServerFactory.createHttpServer(InetAddres.getByName("localhost"), 8000, rc);
        server.start();

        // Create a signaler for each peer in the DHT
        List<Signaler> signallers = new ArrayList<>();
        for (InetAddress peer : peers) {
            Signaler signer = new Signaler(nodeId, peer.getHostAddress(), d[1D[K
dht);
            signallers.add(signer);
        }

        // Run the signalers in parallel
        ExecutorService executor = Executors.newFixedThreadPool(NODE_COUNT)[40D[K
Executors.newFixedThreadPool(NODE_COUNT);
        List<Future<?>> futures = new ArrayList<>();
        for (Signaler signer : signallers) {
            Future<?> future = executor.submit(signer);
            futures.add(future);
        }

        // Wait for all signalers to finish
        for (Future<?> future : futures) {
            try {
                future.get();
            } catch (InterruptedException | ExecutionException e) {
                logger.error("Error running signaler", e);
            }
        }

        // Shutdown the HTTP server
        server.shutdownNow();

        // Shutdown the DHT
        dht.shutdown();

        // Wait for all threads to finish
        executor.shutdown();
    }
}

class Signaler implements Runnable {
    private final String nodeId;
    private final String peerAddress;
    private final DHT dht;

    public Signaler(String nodeId, String peerAddress, DHT dht) {
        this.nodeId = nodeId;
        this.peerAddress = peerAddress;
        this.dht = dht;
    }

    @Override
    public void run() {
        // Handle WebRTC handshake with the peer
        WebRtcHandshake handler = new WebRtcHandshake();
        handler.handle(nodeId, peerAddress);
    }
}

class DHT {
    private final List<InetAddress> peers;

    public DHT(List<InetAddress> peers) {
        this.peers = peers;
    }

    public void shutdown() {
        // Shutdown the DHT
    }
}

class WebRtcHandshake {
    public void handle(String nodeId, String peerAddress) {
        // Handle WebRTC handshake with the peer
    }
}
```

