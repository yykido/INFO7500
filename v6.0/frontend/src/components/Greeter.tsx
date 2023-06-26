import { useWeb3React } from '@web3-react/core';
import { Contract, ethers, Signer } from 'ethers';
import {
  ChangeEvent,
  MouseEvent,
  ReactElement,
  useEffect,
  useState
} from 'react';
import styled from 'styled-components';
// import GreeterArtifact from '../artifacts/contracts/Greeter.sol/Greeter.json';
import AuctionArtifact from '../artifacts/contracts/BasicDutchAuction.sol/BasicDutchAuction.json';
import { Provider } from '../utils/provider';
import { SectionDivider } from './SectionDivider';

const StyledDeployContractButton = styled.button`
  width: 180px;
  height: 2rem;
  border-radius: 1rem;
  border-color: blue;
  cursor: pointer;
  place-self: center;
`;

const StyledGreetingDiv = styled.div`
  display: grid;
  grid-template-rows: 1fr 1fr 1fr;
  grid-template-columns: 135px 2.7fr 1fr;
  grid-gap: 10px;
  place-self: center;
  align-items: center;
`;

const StyledLabel = styled.label`
  font-weight: bold;
`;

const StyledInput = styled.input`
  padding: 0.4rem 0.6rem;
  line-height: 2fr;
`;

const StyledButton = styled.button`
  width: 150px;
  height: 2rem;
  border-radius: 1rem;
  border-color: blue;
  cursor: pointer;
`;

export function Greeter(): ReactElement {
  const context = useWeb3React<Provider>();
  const { library, active } = context;

  const [signer, setSigner] = useState<Signer>();
  const [auctionContract, setAuctionContract] = useState<Contract>(); // TODO
  const [auctionContractAddr, setAuctionContractAddr] = useState<string>(''); // TODO
  const [auctionContractAddrInput, setAuctionContractAddrInput] = useState<string>(''); // TODO
  const [auctionContractAddrInput2, setAuctionContractAddrInput2] = useState<string>(''); // TODO
  const [greeting, setGreeting] = useState<string>('');
  const [winner, setWinner] = useState<string>(''); //
  const [currentPrice, setCurrentPrice] = useState<string>(''); // 
  const [bidPrice, setBidPrice] = useState<string>(''); //
  const [bidPriceInput, setBidPriceInput] = useState<string>(''); //
  const [reservePrice, setReservePrice] = useState<number>(0); //
  const [numBlocksAuctionOpen, setNumBlocksAuctionOpen] = useState<number>(0); //
  const [offerPriceDecrement, setOfferPriceDecrement] = useState<number>(0); //
  const [reservePriceInput, setReservePriceInput] = useState<number>(0); //
  const [numBlocksAuctionOpenInput, setNumBlocksAuctionOpenInput] = useState<number>(0); //
  const [offerPriceDecrementInput, setOfferPriceDecrementInput] = useState<number>(0); //

  // useEffect((): void => {
  //   if (!library) {
  //     setSigner(undefined);
  //     return;
  //   }

  //   setSigner(library.getSigner());
  // }, [library]);

  // useEffect((): void => {
  //   if (!greeterContract) {
  //     return;
  //   }
  //   // modify it
  //   if (!auctionContract) {
  //     return;
  //   }
  //   //


  //   async function getGreeting(greeterContract: Contract): Promise<void> {
  //     const _greeting = await greeterContract.greet();

  //     if (_greeting !== greeting) {
  //       setGreeting(_greeting);
  //     }
  //   }

  //   // modify it
  //   async function getWinner(auctionContract: Contract): Promise<void> {
  //     const _winner = await auctionContract.firstBidder;

  //     if (_winner !== winner) {
  //       setWinner(_winner);
  //     }
  //   }
  //   //

  //   // modify it
  //   async function getCurrentPrice(auctionContract: Contract): Promise<void> {
  //     const _currentPrice = await auctionContract.getCurrentPrice();

  //     if (_currentPrice !== currentPrice) {
  //       setCurrentPrice(_currentPrice);
  //     }
  //   }
  //   //




  //   getGreeting(greeterContract);
  //   /*
  //   getWinner(auctionContract);
  //   getCurrentPrice(auctionContract);
  //    */
  // }, [greeterContract, greeting]);

  useEffect((): void => {
    if (!library) {
      setSigner(undefined);
      return;
    }

    setSigner(library.getSigner());
  }, [library]);

  useEffect((): void => {

    if (!auctionContract) {
      return;
    }

    async function getWinner(auctionContract: Contract): Promise<void> {
      const _winner = await auctionContract.firstBidder;

      if (_winner !== winner) {
        setWinner(_winner);
      }
    }
 
    async function getCurrentPrice(auctionContract: Contract): Promise<void> {
      const _currentPrice = await auctionContract.getCurrentPrice();

      if (_currentPrice !== currentPrice) {
        setCurrentPrice(_currentPrice);
      }
    }

    
    getWinner(auctionContract);
    getCurrentPrice(auctionContract);
     
  }, [auctionContract, bidPrice]);

  
  function handleDeployContract(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();

    // only deploy the Greeter contract one time, when a signer is defined
    if (auctionContract || !signer) {
      return;
    }

    async function deployAuctionContract(signer: Signer, reservePrice: number, numBlocksAuctionOpen: number, offerPriceDecrement: number): Promise<void> {
      const Auction = new ethers.ContractFactory(
        AuctionArtifact.abi,
        AuctionArtifact.bytecode,
        signer
      );

      console.log('signer: ',signer);
      console.log('Auction: ',Auction);
      

      console.log('reservePrice: ',reservePrice);
      console.log('numBlocksAuctionOpen: ',numBlocksAuctionOpen);
      console.log('offerPriceDecrement: ',offerPriceDecrement);

      try {
        const auctionContract = await Auction.deploy(reservePrice, numBlocksAuctionOpen, offerPriceDecrement);
        await auctionContract.deployed();

        // const winner = await auctionContract.firstBidder;

        // setAuctionContract(auctionContract);
        // setWinner(winner);

        // window.alert(`Auction deployed to: ${auctionContract.address}`);

        // setAuctionContractAddr(auctionContract.address);
      } catch (error: any) {
        window.alert(
          'Error!' + (error && error.message ? `\n\n${error.message}` : '')
        );
      }
    }

    deployAuctionContract(signer,reservePriceInput,numBlocksAuctionOpenInput,offerPriceDecrementInput);
  }
  
  function handleBidAmountChange(event: ChangeEvent<HTMLInputElement>): void {
    event.preventDefault();
    setBidPriceInput(event.target.value);
  }

  function handleReservePriceChange(event: ChangeEvent<HTMLInputElement>): void {
    event.preventDefault();
    setReservePriceInput(parseInt(event.target.value, 10));
  }

  function handleNumBlocksAuctionOpenChange(event: ChangeEvent<HTMLInputElement>): void {
    event.preventDefault();
    setNumBlocksAuctionOpenInput(parseInt(event.target.value, 10));
  }

  function handleOfferPriceDecrementChange(event: ChangeEvent<HTMLInputElement>): void {
    event.preventDefault();
    
    setOfferPriceDecrementInput(parseInt(event.target.value, 10));
  }

  function handleContractAddressChange1(event: ChangeEvent<HTMLInputElement>): void {
    event.preventDefault();
    setAuctionContractAddrInput(event.target.value);
  }
  function handleContractAddressChange2(event: ChangeEvent<HTMLInputElement>): void {
    event.preventDefault();
    setAuctionContractAddrInput2(event.target.value);
  }

  function handleBidSubmit(event: MouseEvent<HTMLButtonElement>): void {
    event.preventDefault();

    if (!auctionContract) {
      window.alert('Undefined auctionContract');
      return;
    }

    if(auctionContractAddrInput2 !== auctionContract.address) {
      window.alert('Invalid address');
      return;
    }

    if (!bidPriceInput) {
      window.alert('bid amount cannot be empty');
      return;
    }

    async function submitBid(auctionContract: Contract): Promise<void> {
      try {
        const setBidTxn = await auctionContract.bid(bidPriceInput);

        await setBidTxn.wait();

        const newBid = await auctionContract.firstBid;
        window.alert(`Success!\n\nBid Amount is now: ${newBid}`);
        setBidPrice(bidPrice);

        if(newBid >= auctionContract.getCurrentPrice()) {
          setBidPrice(newBid);
        }
      } catch (error: any) {
        window.alert(
          'Error!' + (error && error.message ? `\n\n${error.message}` : '')
        );
      }
    }

    submitBid(auctionContract);
  }

  function handleShowInfo(event: MouseEvent<HTMLButtonElement>): void {
    event.preventDefault();

    if (!auctionContract) {
      window.alert('Undefined auctionContract');
      return;
    }

    if (!auctionContractAddrInput) {
      window.alert('The address of the contract cannot be empty');
      return;
    }

    async function showInfo(auctionContract: Contract): Promise<void> {
      try {
        const currentReservePrice = await auctionContract.reservePrice;
        const currentNumBlocksAuctionOpen = await auctionContract.numBlocksAuctionOpen;
        const currentOfferPriceDecrement = await auctionContract.offerPriceDecrement;
        const _currentPrice = await auctionContract.getCurrentPrice();
        const winner = await auctionContract.firstBidder;

        setReservePrice(currentReservePrice);
        setNumBlocksAuctionOpen(currentNumBlocksAuctionOpen);
        setOfferPriceDecrement(currentOfferPriceDecrement);
        setCurrentPrice(_currentPrice);
        setWinner(winner);

      } catch (error: any) {
        window.alert(
          'Error!' + (error && error.message ? `\n\n${error.message}` : '')
        );
      }
    }

    showInfo(auctionContract);
  }
  
  return (
    <>
      <StyledInput
        id="greetingInput"
        type="text"
        placeholder={'Insert reserve price here'}
        onChange={handleReservePriceChange}
        style={{ fontStyle: greeting ? 'normal' : 'italic', width: '300px' }}
      ></StyledInput>
      <StyledInput
        id="greetingInput"
        type="text"
        placeholder={'Insert number blocks auction open here'}
        onChange={handleNumBlocksAuctionOpenChange}
        style={{ fontStyle: greeting ? 'normal' : 'italic', width: '300px' }}
      ></StyledInput>
      <StyledInput
        id="greetingInput"
        type="text"
        placeholder={'Insert offer price decrement here'}
        onChange={handleOfferPriceDecrementChange}
        style={{ fontStyle: greeting ? 'normal' : 'italic', width: '300px' }}
      ></StyledInput>
      <StyledDeployContractButton
        disabled={!active || auctionContract ? true : false}
        style={{
          cursor: !active || auctionContract ? 'not-allowed' : 'pointer',
          borderColor: !active || auctionContract ? 'unset' : 'blue'
        }}
        onClick={handleDeployContract}
      >
        Deploy Auction Contract
      </StyledDeployContractButton>
      <StyledLabel>Contract addr</StyledLabel>
        <div>
          {auctionContractAddr ? (
            auctionContractAddr
          ) : (
            <em>{`<Contract not yet deployed>`}</em>
          )}
        </div>
        {/* empty placeholder div below to provide empty first row, 3rd col div for a 2x3 grid */}
      <SectionDivider />
      <StyledInput
        id="greetingInput"
        type="text"
        placeholder={'Insert address of the contract'}
        onChange={handleContractAddressChange1}
        style={{ fontStyle: greeting ? 'normal' : 'italic', width: '300px' }}
      ></StyledInput>
      <StyledButton
        disabled={!active || !auctionContract ? true : false}
        style={{
          cursor: !active || !auctionContract ? 'not-allowed' : 'pointer',
          borderColor: !active || !auctionContract ? 'unset' : 'blue'
        }}
        onClick={handleShowInfo}
      >
        Show info
      </StyledButton>
      <StyledLabel>Winner</StyledLabel>
      <div>
        {winner ? (
          winner
        ) : (
          <em>{`<Contract not yet deployed>`}</em>
        )}
      </div>
      <StyledLabel>Constructor parameters</StyledLabel>
      <div>
        {reservePrice ? (
          reservePrice
        ) : (
          <em>{`<Contract not yet deployed>`}</em>
        )}
      </div>
      <div>
        {numBlocksAuctionOpen ? (
          numBlocksAuctionOpen
        ) : (
          <em>{`<Contract not yet deployed>`}</em>
        )}
      </div>
      <div>
        {offerPriceDecrement ? (
          offerPriceDecrement
        ) : (
          <em>{`<Contract not yet deployed>`}</em>
        )}
      </div>
      <StyledLabel>Current price</StyledLabel>
      <div>
        {currentPrice ? (
          currentPrice
        ) : (
          <em>{`<Contract not yet deployed>`}</em>
        )}
      </div>

      <SectionDivider />
      <StyledGreetingDiv>
        <StyledLabel></StyledLabel>
        <div></div>
        {/* empty placeholder div below to provide empty first row, 3rd col div for a 2x3 grid */}
        <div></div>
        <StyledLabel>Address of the contract</StyledLabel>
        {/* <div>
          {bidPrice ? bidPrice : <em>{`<Contract not yet deployed>`}</em>}
        </div> */}
        {/* empty placeholder div below to provide empty first row, 3rd col div for a 2x3 grid */}
        <StyledInput
          id="greetingInput"
          type="text"
          placeholder={'Insert address of the contract'}
          onChange={handleContractAddressChange2}
          style={{ fontStyle: greeting ? 'normal' : 'italic' }}
        ></StyledInput>
        <div></div>
        <StyledLabel htmlFor="greetingInput">Set new bid price</StyledLabel>
        <StyledInput
          id="greetingInput"
          type="text"
          placeholder={'insert your bid price'}
          onChange={handleBidAmountChange}
          style={{ fontStyle: greeting ? 'normal' : 'italic' }}
        ></StyledInput>
        <StyledButton
          disabled={!active || !auctionContract ? true : false}
          style={{
            cursor: !active || !auctionContract ? 'not-allowed' : 'pointer',
            borderColor: !active || !auctionContract ? 'unset' : 'blue'
          }}
          onClick={handleBidSubmit}
        >
          Submit
        </StyledButton>
        <StyledLabel htmlFor="greetingInput">{true ? '':'You win'}</StyledLabel>
      </StyledGreetingDiv>
    </>
  );
}
