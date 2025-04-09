import { AmazonConnectApp } from "@amazon-connect/app";
import { AgentClient } from "@amazon-connect/contact";

let appProvider = null;
let agentClient = null;

export async function initializeConnect() {
    try {
        // Initialize Amazon Connect App SDK
        const { provider } = await AmazonConnectApp.init({
            onCreate: (event) => {
                const { appInstanceId } = event.context;
                console.log('App initialized: ', appInstanceId);
            },
            onDestroy: (event) => {
                console.log('App being destroyed');
            },
        });

        // Store the provider
        appProvider = provider;
        // Initialize Agent Client
        agentClient = new AgentClient();
        return provider;
    } catch (error) {
        console.error('Error initializing Connect:', error);
        throw error;
    }
}

export async function getAgentArn() {
    try {
        // Check if agent is available
        if (!agentClient) {
            throw new Error('Agent client is not available');
        }

        // Get agent information
        const agentArn = await agentClient.getARN();
        const agentName = await agentClient.getName();

        // Validate returned values
        if (!agentArn) {
            throw new Error('Agent ARN is not available');
        }

        // console.log(`Got the arn value: ${agentArn}`);
        // console.log(`Agent name: ${agentName}`);

        return {
            agentArn,
            agentName: agentName || 'Unknown Agent'
        };
    } catch (error) {
        console.error('Error getting agent ARN:', error);
        // Ensure we're throwing an error with a message
        throw new Error(error.message || 'Failed to get agent information');
    }
}