import { Contract, providers, utils } from 'ethers';
import Head from 'next/head';
import React, { useEffect, useRef, useState } from 'react';
import Web3Modal from 'web3modal';
import { abi, NFT_CONTRACT_ADDRESS } from '../constants';
import styles from '../styles/Home.module.css';

export default function Home() {
	const web3ModalRef = useRef();
	const [walletConnected, setWalletConnected] = useState(false);
	const [presaleStarted, setPresaleStarted] = useState(false);
	const [presaleEnded, setPresaleEnded] = useState(false);
	const [loading, setLoading] = useState(false);
	const [isOwner, setIsOwner] = useState(false);
	const [tokenIdsMinted, setTokenIdsMinted] = useState('0');

	const presaleMint = async () => {
		try {
			const signer = await getProviderOrSigner(true);
			const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, signer);
			const tx = await nftContract.presaleMint({
				value: utils.parseEther('0.01'),
			});
			setLoading(true);
			await tx.wait();
			setLoading(false);
		} catch (error) {
			console.log(error);
		}
	};
	const publicMint = async () => {
		try {
			const signer = await getProviderOrSigner(true);
			const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, signer);
			const tx = await nftContract.mint({
				value: utils.parseEther('0.01'),
			});
			setLoading(true);
			await tx.wait();
			setLoading(false);
			window.alert('You have successfully minted a CryptoDev!');
		} catch (error) {
			console.log(error);
		}
	};
	const startPreSale = async () => {
		try {
			const signer = await getProviderOrSigner(true);
			const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, signer);
			const tx = await nftContract.startPresale();
			setLoading(true);
			await tx.wait();
			setLoading(false);

			// set the presale started to true
			await checkIfPresaleStarted();
		} catch (error) {
			console.log(error);
		}
	};
	const checkIfPresaleStarted = async () => {
		try {
			const provider = await getProviderOrSigner();
			const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
			const _presaleStarted = await nftContract.presaleStarted();
			if (!_presaleStarted) {
				await getOwner();
			}
			setPresaleStarted(_presaleStarted);
			return _presaleStarted;
		} catch (error) {
			console.log(error);
			return false;
		}
	};
	const checkIfPresaleEnded = async () => {
		try {
			const provider = await getProviderOrSigner();
			const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
			const _presaleEnded = await nftContract.presaleEnded();
			const hasEnded = _presaleEnded.lt(Math.floor(Date.now() / 1000));
			if (hasEnded) {
				setPresaleEnded(true);
			} else {
				setPresaleEnded(false);
			}
			return hasEnded;
		} catch (error) {
			console.log(error);
			return false;
		}
	};
	const getOwner = async () => {
		try {
			const provider = await getProviderOrSigner();
			const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
			const _owner = await nftContract.owner();
			const signer = await getProviderOrSigner(true);
			const address = await signer.getAddress();
			if (address.toLowerCase() === _owner.toLowerCase()) {
				setIsOwner(true);
			}
		} catch (error) {
			console.log(error);
		}
	};

	const getTokenIdsMinted = async () => {
		try {
			const provider = await getProviderOrSigner();
			const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
			const _tokenIds = await nftContract.tokenIds();
			setTokenIdsMinted(_tokenIds.toString());
		} catch (error) {
			console.log(error);
		}
	};

	const connectWallet = async () => {
		try {
			await getProviderOrSigner();
			setWalletConnected(true);
		} catch (error) {
			console.log(error);
		}
	};
	const getProviderOrSigner = async (needSigner = false) => {
		const provider = await web3ModalRef.current.connect();
		const web3Provider = new providers.Web3Provider(provider);

		const { chainId } = await web3Provider.getNetwork();
		if (chainId != 80001) {
			window.alert('Change the network to Mumbai');
			throw new Error('Change the network to Mumbai');
		}
		if (needSigner) {
			const signer = await web3Provider.getSigner();
			return signer;
		}
		return web3Provider;
	};

	useEffect(() => {
		//if wallet not connected
		if (!walletConnected) {
			web3ModalRef.current = new Web3Modal({
				network: 'matic',
				providerOptions: {},
				disableInjectedProvider: false,
			});
			connectWallet();

			//check if presale started
			const _presaleStarted = checkIfPresaleStarted();
			if (_presaleStarted) {
				checkIfPresaleEnded();
			}

			getTokenIdsMinted();

			// set an interval which gets called every 5 seconds to check presale has ended
			const presaleEndedInterval = setInterval(async function () {
				const _presaleStarted = await checkIfPresaleStarted();
				if (_presaleStarted) {
					const _presaleEnded = await checkIfPresaleEnded();
					if (_presaleEnded) {
						clearInterval(presaleEndedInterval);
					}
				}
			}, 5 * 1000);

			setInterval(async function () {
				await getTokenIdsMinted();
			}, 5 * 1000);
		}
	}, [walletConnected]);

	const renderButton = () => {
		if (!walletConnected) {
			return (
				<div className={styles.button} onClick={connectWallet}>
					Connect Your Wallet
				</div>
			);
		}

		if (loading) {
			return <button className={styles.button}>Loading...</button>;
		}

		if (isOwner && !presaleStarted) {
			return (
				<button className={styles.button} onClick={startPreSale}>
					Start Presale!
				</button>
			);
		}

		if (!presaleStarted) {
			return (
				<div>
					<div className={styles.description}>Presale hasnt started!</div>
				</div>
			);
		}

		if (presaleStarted && !presaleEnded) {
			return (
				<div>
					<div className={styles.description}>
						Presale has started!!! If your address is whitelisted, Mint a Crypto
						Dev 🥳
					</div>
					<button className={styles.button} onClick={presaleMint}>
						Presale Mint 🚀
					</button>
				</div>
			);
		}

		if (presaleStarted && presaleEnded) {
			return (
				<button className={styles.button} onClick={publicMint}>
					Public Mint 🚀
				</button>
			);
		}
	};

	return (
		<div>
			<Head>
				<title>Crypto Devs</title>
				<meta name='description' content='Whitelist-Dapp' />
				<link rel='icon' href='/favicon.ico' />
			</Head>
			<div className={styles.main}>
				<div>
					<h1 className={styles.title}>Welcome to Crypto Devs!</h1>
					<div className={styles.description}>
						Its an NFT collection for developers in Crypto.
					</div>
					<div className={styles.description}>
						{tokenIdsMinted}/20 have been minted
					</div>
					{renderButton()}
				</div>
				<div>
					<img className={styles.image} src='./cryptodevs/0.svg' />
				</div>
			</div>

			<footer className={styles.footer}>
				Made with &#10084; by Crypto Devs
			</footer>
		</div>
	);
}
