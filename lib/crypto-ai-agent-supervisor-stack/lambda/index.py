# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
import json
import boto3
import requests
import os
from web3 import Web3
from math import log10
from datetime import datetime, timedelta 
from eth_account._utils.legacy_transactions import serializable_unsigned_transaction_from_dict

aws_region = boto3.session.Session().region_name

def getBlockchainRPCURL():
    # use a blockchain rpc endpoint if it has been provided
    blockchain_rpc_url = os.environ.get('BLOCKCHAIN_RPC_URL')
    if blockchain_rpc_url:
        return blockchain_rpc_url
    # else return the AMB endpoint
    #AMB accessor token
    amb_accessor_token = os.environ.get('AMB_ACCESSOR_TOKEN')
    if not amb_accessor_token:
        raise ValueError("AMB_ACCESSOR_TOKEN environment variable is not set")
    #We use Polygon here
    blockchain_rpc_url = f"https://mainnet.polygon.managedblockchain.us-east-1.amazonaws.com/?billingtoken={amb_accessor_token}"
    return blockchain_rpc_url

w3 = Web3(Web3.HTTPProvider(getBlockchainRPCURL()))

# Get chain ID
chain_id = w3.eth.chain_id
print(f"Connected to network with chain ID: {chain_id}")

#CoinGecko private key for making calls
coingecko_api_key = os.environ.get('COINGECKO_API_KEY')
if not coingecko_api_key:
    raise ValueError("COINGECKO_API_KEY environment variable is not set")

# Vitalik's wallet address
vitalikaddr = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

# Check for connection to the network
if not w3.is_connected():
    raise ConnectionError("Failed to connect to HTTPProvider")

# Get the KMS key by alias
def get_kms_key():
    kms_client = boto3.client('kms')
    try:
        kms_key = kms_client.describe_key(
            KeyId='alias/crypto-ai-agent-wallet'
        )['KeyMetadata']['KeyId']
        print(f"Found KMS key: {kms_key}")
        return kms_key
    except Exception as e:
        print(f"Error getting KMS key: {e}")
        raise

# Get wallet address
def get_wallet_address():
    try:
        # Get the KMS key ID first
        key_id = get_kms_key()
        
        # Get the public key using the key ID
        kms_client = boto3.client('kms')
        public_key_response = kms_client.get_public_key(
            KeyId=key_id
        )
        print(f"Retrieved public key response: {public_key_response}")
        
        # Extract the public key bytes (removes DER encoding)
        public_key_bytes = public_key_response['PublicKey']
        print(f"Extracted public key bytes: {public_key_bytes}")

        # Import required libraries for key handling
        from cryptography.hazmat.primitives import serialization
        from eth_keys import keys
        from eth_utils import keccak
        
        # Load the public key
        public_key = serialization.load_der_public_key(public_key_bytes)
        print(f"Loaded public key: {public_key}")
        
        # Convert to bytes and remove the first byte (0x04 prefix for uncompressed public keys)
        public_key_bytes = public_key.public_bytes(
            encoding=serialization.Encoding.X962,
            format=serialization.PublicFormat.UncompressedPoint
        )[1:]
        print(f"Converted public key to bytes and removed prefix: {public_key_bytes}")
        
        # Generate Keccak-256 hash of the public key
        keccak_hash = keccak(public_key_bytes)
        print(f"Generated Keccak-256 hash: {keccak_hash.hex()}")
        
        # Take last 20 bytes to get the address
        address = '0x' + keccak_hash[-20:].hex()
        
        print(f"Derived Ethereum address: {address}")
        checksum_address = Web3.to_checksum_address(address)
        print(f"Checksum Ethereum address: {checksum_address}")
        return checksum_address
        
    except Exception as e:
        print(f"Error getting wallet address: {e}")
        raise

#Check ENS address
def resolve_ens(ens_name):
    try:
        # Check if the name is a valid ENS name
        if not ens_name.endswith('.eth'):
            return None  # Not an ENS name, return None

        # Resolve the ENS name to an Ethereum address
        address = w3.ens.address(ens_name)
        
        if address is None:
            print(f"The ENS name {ens_name} is not registered or does not have an address set.")
            return None
        else:
            print(f"The address for {ens_name} is: {address}")
            return address
    
    except Exception as e:
        print(f"An error occurred while resolving ENS: {e}")
        return None

   
def sendTx(receiver, amount):
    
    from_address = get_wallet_address()
    
    print(f"Original receiver: {receiver}")
    
    # Check if it's an ENS domain, if so resolve it
    resolved_address = resolve_ens(receiver)
    if resolved_address:
        receiver = resolved_address
    
    print(f"Final receiver address: {receiver}")

    # Define transaction parameters
    transaction = {
            'to': receiver,
            'value': w3.to_wei(amount, 'ether'),  
            'gas': 21000,  # 
            'gasPrice': w3.to_wei(150, 'gwei'),
            'nonce': w3.eth.get_transaction_count(from_address),
            'chainId': chain_id,
    }

    print(f"Transaction details: {transaction}")

    unsigned_tx = ""
    # Create the unsigned transaction
    try:
        unsigned_tx = serializable_unsigned_transaction_from_dict(transaction)
    except Exception as e:
        print(f"Error serializing transaction: {e}")
        return "Failed to send because of serialization error"
    print(f"Unsigned transaction: {unsigned_tx}")
    # message_to_sign = unsigned_tx.hash()
    message_to_sign = unsigned_tx
    print(f"Message to sign: {message_to_sign.hex()}")

    # Sign the transaction hash using KMS
    kms_client = boto3.client('kms')
    print(f"Initialized KMS client")
    sign_response = kms_client.sign(
        KeyId='alias/crypto-ai-agent-wallet',
        Message=message_to_sign,
        MessageType='RAW',
        SigningAlgorithm='ECDSA_SHA_256'
    )
    print(f"Signature response: {sign_response}")

    # Extract r, s values from the signature
    r = int.from_bytes(sign_response['Signature'][:32], 'big')
    s = int.from_bytes(sign_response['Signature'][32:64], 'big')
    v = chain_id * 2 + 35  # Standard v value for EIP-155
    print(f"Extracted v: {v}, r: {r}, s: {s}")

    # Create the signed transaction
    signed_tx = w3.eth.account.account.Transaction(
        nonce=transaction['nonce'],
        gasPrice=transaction['gasPrice'],
        gas=transaction['gas'],
        to=transaction['to'],
        value=transaction['value'],
        data=b'',
        v=v,
        r=r,
        s=s
    )
    print(f"Signed transaction: {signed_tx}")

    # Send the transaction
    try:
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    except Exception as e:
        print(f"Error sending transaction: {e}")
        return "Transaction failed"
    else:
        print(f"Transaction sent with hash: {tx_hash.hex()}")

        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
            
        print(f"Transaction successful with hash: {tx_hash.hex()}")
            
        return tx_hash.hex()

def investAdviceMetric():
    url = "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=365&interval=daily"
    headers = {
        "accept": "application/json",
        "x-cg-demo-api-key": coingecko_api_key
    }
    
    response = requests.get(url, headers=headers)
    data = response.json()
    
    prices = [price[1] for price in data['prices']]
    current_price = prices[-1]
    all_time_high = max(prices)  
    
    # Calculate 200-day moving average
    ma_200 = sum(prices[-200:]) / min(200, len(prices))
    
    ath_ratio = current_price / all_time_high
    ma_ratio = current_price / ma_200
    
    sbci = (ath_ratio + ma_ratio) / 2
        
    print(f"Current Price: ${current_price:.2f}")
    print(f"All Time High: ${all_time_high:.2f}")
    print(f"200-day Moving Average: ${ma_200:.2f}")
    print(f"Simple Bitcoin Cycle Index: {sbci:.2f}")
    print("Index ranges:")
    print("0.00 - 0.25: Extremely Undervalued")
    print("0.25 - 0.50: Undervalued")
    print("0.50 - 0.75: Fair Value")
    print("0.75 - 1.00: Overvalued")
    print("1.00+: Extremely Overvalued")
        
    if sbci <= 0.25:
        return "The market appears extremely undervalued. Consider investing but be aware of potential further downside."
    elif sbci <= 0.50:
        return "The market appears somewhat undervalued. This might be a good opportunity for dollar-cost averaging or increasing your position."
    elif sbci <= 0.75:
        return "The market seems to be around fair value. This might be a good time to hold your current position and continue to monitor the market."
    elif sbci <= 1.00:
        return "The market appears overvalued. Consider taking some profits or reducing your position."
    else:
        return "The market appears extremely overvalued. This might be a good time to take significant profits."

def estimate_gas(to_address, value, data='', gas_price=None):

    from_address = get_wallet_address()

    if not w3.is_connected():
        raise Exception("Failed to connect to the network")

    # Prepare transaction data
    transaction = {
        'from': from_address,
        'to': to_address,
        'value': w3.to_wei(value, 'ether'),  
        'data': data,
    }

    # If gas price is provided, add it to the transaction
    if gas_price:
        transaction['gasPrice'] = w3.to_wei(gas_price, 'gwei')

    try:
        # Estimate
        gas_estimate = w3.eth.estimate_gas(transaction)
        return gas_estimate
    except Exception as e:
        print(f"Error estimating gas: {e}")
        return None

    
def getBalance(address):

    #Check if it's an ENS domain, if so resolve it
    if not address:
        address = get_wallet_address()
    elif address.endswith('.eth'):
        address = resolve_ens(address)
    
    balance = w3.eth.get_balance(address)

    # Convert balance from Wei to Ether
    ether_balance = w3.from_wei(balance, 'ether')
    
    print(f"Account {address} has a balance of {ether_balance} Ether")
    
    return ether_balance

def getWalletAddress():
    address = get_wallet_address()
    return address
    
def getCryptoPrice(token):
    
    url = "https://api.coingecko.com/api/v3/coins/markets"
    
    params = {
    "vs_currency": "usd",
    "ids": token.lower()
    }
    headers = {
        "accept": "application/json",
        "x-cg-demo-api-key": coingecko_api_key
    }
    
    response = requests.get(url, params=params, headers=headers)
    
    print(response.text)
    
    if response.status_code == 200:
        data = response.json()
        if data:
            price = data[0]["current_price"]
            return price
        else:
            return f"No data found for {token}"
    else:
        return f"Error: {response.status_code} - {response.text}"

def lambda_handler(event, context):
    agent = event['agent']
    actionGroup = event['actionGroup']
    function = event['function']    

    if function == "sendTx":
        parameters = {param['name']: param['value'] for param in event['parameters']}
    
        print (parameters)
        
        amount = parameters.get('amount')
        receiver = parameters.get('receiver')
        
        result = sendTx(receiver,amount)
        responseBody =  {
        "TEXT": {
            "body": result
        }
    }
    
    elif function == "estimateGas":
        value = 0.000001  # ETH
        result = estimate_gas(vitalikaddr, value)

        responseBody =  {
        "TEXT": {
            "body": result
        }
    }

    elif function =="getBalance":
        parameters = {param['name']: param['value'] for param in event['parameters']}
    
        print (parameters)
        address = parameters.get('address')
        result = getBalance(address)
        responseBody =  {
        "TEXT": {
            "body": result
        }
    }
    
    elif function =="getCryptoPrice":
        parameters = {param['name']: param['value'] for param in event['parameters']}
    
        print (parameters)
        token = parameters.get('token')
        result = getCryptoPrice(token)
        responseBody =  {
        "TEXT": {
            "body": result
        }
    }
    elif function =="investAdviceMetric":

        result = investAdviceMetric()
        responseBody =  {
        "TEXT": {
            "body": result
        }
    }
    elif function =="getWalletAddress":

        result = getWalletAddress()
        responseBody =  {
        "TEXT": {
            "body": result
        }
    }
    else:
        responseBody =  {
        "TEXT": {
            "body": f"Function {function} not found"
        }
    }
        

    action_response = {
        'actionGroup': actionGroup,
        'function': function,
        'functionResponse': {
            'responseBody': responseBody
        }

    }

    function_response = {'response': action_response, 'messageVersion': event['messageVersion']}
    print("Response: {}".format(function_response))

    return function_response