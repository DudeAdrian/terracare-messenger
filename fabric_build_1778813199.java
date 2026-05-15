```java
import org.hyperledger.fabric.sdk.Channel;
import org.hyperledger.fabric.sdk.ProposalResponse;
import org.hyperledger.fabric.sdk.User;

import java.util.*;

public class ClusterManager {
    private Map<String, Channel> channels = new HashMap<>();
    private List<User> members = new ArrayList<>();

    public void joinChannel(String channelName) {
        if (channels.containsKey(channelName)) {
            return;
        }

        Channel channel = new Channel(channelName);
        channels.put(channelName, channel);

        // Get the member from TerraCare Ledger
        User member = getMemberFromTerraCareLedger();

        members.add(member);

        try {
            // Add member to channel
            ProposalResponse response = addMemberToChannel(channel, member)[7D[K
member);

            if (response.getStatus().equals(ProposalResponse.Status.SUCCESS[60D[K
(response.getStatus().equals(ProposalResponse.Status.SUCCESS)) {
                System.out.println("Added member " + member.getName() + " t[1D[K
to channel " + channelName);
            } else {
                throw new Exception("Failed to add member to channel");
            }
        } catch (Exception e) {
            System.out.println("Error joining channel: " + e.getMessage());[16D[K
e.getMessage());
        }
    }

    public void leaveChannel(String channelName, String memberId) {
        Channel channel = channels.get(channelName);

        if (channel == null || !members.contains(getMemberFromTerraCareLedg[44D[K
!members.contains(getMemberFromTerraCareLedger(memberId))) {
            return;
        }

        try {
            // Remove member from channel
            ProposalResponse response = removeMemberFromChannel(channel, ge[2D[K
getMemberFromTerraCareLedger());

            if (response.getStatus().equals(ProposalResponse.Status.SUCCESS[60D[K
(response.getStatus().equals(ProposalResponse.Status.SUCCESS)) {
                System.out.println("Removed member " + memberId + " from ch[2D[K
channel " + channelName);
            } else {
                throw new Exception("Failed to remove member from channel")[9D[K
channel");
            }
        } catch (Exception e) {
            System.out.println("Error leaving channel: " + e.getMessage());[16D[K
e.getMessage());
        }

        members.remove(getMemberFromTerraCareLedger(memberId));
    }

    public void getChannelMembers(String channelName) {
        Channel channel = channels.get(channelName);

        if (channel == null) {
            return;
        }

        List<User> membersInChannel = new ArrayList<>();

        for (User member : members) {
            if (member.getChannelNames().contains(channelName)) {
                membersInChannel.add(member);
            }
        }

        System.out.println("Members in channel " + channelName + ": " + mem[3D[K
membersInChannel);
    }

    public User getMemberFromTerraCareLedger() {
        // Assume we have a method to get the member from TerraCare Ledger
        return getMemberFromTerraCareLedger(null); // For the time being, a[1D[K
assuming null as ID for getting all members
    }

    public User getMemberFromTerraCareLedger(String memberId) {
        // Assume we have a method to get the member from TerraCare Ledger
        // This will be implemented in future based on actual implementatio[13D[K
implementation of TerraCare Ledger
        return new User(memberId, "Name", Arrays.asList("Channel 1", "Chann[6D[K
"Channel 2"));
    }

    public ProposalResponse addMemberToChannel(Channel channel, User user) [K
{
        // Assume we have a method to add member to channel using Fabric SD[2D[K
SDK
        // This will be implemented in future based on actual implementatio[13D[K
implementation of TerraCare Ledger and Fabric SDK
        return new ProposalResponse("Success");
    }

    public ProposalResponse removeMemberFromChannel(Channel channel, User u[1D[K
user) {
        // Assume we have a method to remove member from channel using Fabr[4D[K
Fabric SDK
        // This will be implemented in future based on actual implementatio[13D[K
implementation of TerraCare Ledger and Fabric SDK
        return new ProposalResponse("Success");
    }
}
```

