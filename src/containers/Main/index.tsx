import React, {
  useContext,
  useRef,
  useReducer,
  useEffect,
  useState,
} from 'react';
import {
  Button,
  Navbar,
  Alignment,
  NonIdealState,
  Icon,
  Alert,
  Popover,
  Position,
  MenuItem,
  MenuDivider,
} from '@blueprintjs/core';
import { isMobile } from 'react-device-detect';

import {
  BitmapWavHeader,
  getBitmapHeaderInfo,
  getTypeIdFromBuffer,
} from 'digital-voyager-image-sound-core/lib/helpers';
import { bitmapTypeIds } from 'digital-voyager-image-sound-core/lib/constants';

import LogContext from 'contexts/Log';

import {
  processSound,
  onDecodeFinished,
  clearStage,
  saveDecodedFile,
} from 'helpers/processSound';
import fileToBuffer from 'helpers/fileToBuffer';

import InfoBar from 'components/InfoBar';
import FileInput from 'components/FileInput';
import Audio from 'components/Audio';
import VisualizerCanvas from 'components/VisualizerCanvas';
import StageCanvas from 'components/StageCanvas';
import EncodeImageStatus from 'components/EncodeImageStatus';

import theme from 'theme';

import {
  MIN_VISUALIZER_WIDTH,
  MIN_STAGE_WIDTH,
  MIN_STAGE_HEIGHT,
  UNKNOWN_BITMAP_TYPE_ID,
} from '../../constants';

import { mainReducer } from 'store';
import { initialState } from 'store/main/reducer';
import * as actions from 'store/main/actions';

import {
  Container,
  Content,
  Menu,
  Title,
  Description,
  Info,
  MainStage,
  StageWrapper,
  AppLogo,
} from './styles';

import logo from '../../assets/svgs/app_icon.svg';

const Main = React.memo(() => {
  const [state, dispatch] = useReducer(mainReducer, initialState);
  const {
    soundFileOpen,
    soundFile,
    imageFileOpen,
    imageFile,
    fileTypeId,
    soundFileBuffer,
    bitmapHeader,
    isDecoding,
    currentSoundFileDecoded,
  } = state;

  const [showAlert, setShowAlert] = useState(false);
  const log = useContext(LogContext);
  const visualizerCanvasRef = useRef<HTMLCanvasElement>(null);
  const stageCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const soundFileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onDecodeFinished(() => {
      // Update state
      dispatch(actions.decodingProcessFinished());
      log.setIcon('tick');
      log.setText('Decoding process completed!');
    });
  }, [log]);

  // On open sound file to be decoded to image
  const handlerOpenSoundFile = () => {
    // If Encode image component is activated
    if (imageFileOpen) {
      // Update state
      dispatch(actions.reset());
    }

    setTimeout(() => {
      soundFileInputRef.current?.click();
    }, 500);
  };

  // On open image file to be encoded to sound
  const handlerOpenImageFile = () => {
    imageFileInputRef.current?.click();
  };

  // On select sound file
  const handlerOnSelectSoundFile = async () => {
    const audioFiles = soundFileInputRef.current?.files;
    let fileTypeId: number;
    let bitmapHeader: BitmapWavHeader | null = null;

    if (audioFiles && audioFiles.length) {
      const currentSoundFileBuffer = await fileToBuffer(audioFiles[0]);
      fileTypeId = getTypeIdFromBuffer(currentSoundFileBuffer);

      // If file has Bitmap typeId
      if (bitmapTypeIds.indexOf(fileTypeId) !== -1) {
        bitmapHeader = getBitmapHeaderInfo(currentSoundFileBuffer);

        log.setIcon('tick');
        log.setText('File opened and ready to be decoded');
      } else {
        // Force a Bitmap loader type and show the alert saying that the
        // file was not properly encoded / not generated by this program
        bitmapHeader = {
          typeId: UNKNOWN_BITMAP_TYPE_ID,
          width: MIN_STAGE_WIDTH,
          height: MIN_STAGE_HEIGHT,
        } as BitmapWavHeader;

        log.setIcon('warning-sign');
        log.setText(
          'Unknown file type. This is not a properly encoded audio file!'
        );

        setShowAlert(true);
      }

      // Update state
      dispatch(
        actions.audioFileOpened(
          fileTypeId,
          currentSoundFileBuffer,
          bitmapHeader,
          audioFiles[0]
        )
      );

      // Clear stage canvas
      clearStage();
    }
  };

  // On select image file
  const handlerOnSelectImageFile = () => {
    const imageFiles = imageFileInputRef.current?.files;
    if (imageFiles && imageFiles.length) {
      // Update state
      dispatch(actions.imageFileOpened(imageFiles[0]));

      log.setIcon('tick');
      log.setText(
        'Image file opened. Select the Bits depth you want to use to encode it.'
      );
    }
  };

  const handlerPlayAndDecode = () => {
    if (
      visualizerCanvasRef.current &&
      stageCanvasRef.current &&
      audioRef.current &&
      soundFile
    ) {
      processSound(
        visualizerCanvasRef.current,
        stageCanvasRef.current,
        audioRef.current,
        soundFile
      );

      // Update state
      dispatch(actions.decodingProcessStarted());
      log.setIcon('full-stacked-chart');
      log.setText('Deconding...');
    }
  };

  const handlerOnClickSaveDecodedFile = () => {
    if (soundFileBuffer != null && fileTypeId != null) {
      saveDecodedFile();

      log.setIcon('tick');
      log.setText('Done');
    }
  };

  const handlerOnTimeUpdate = (
    event: React.SyntheticEvent<HTMLAudioElement, Event> | undefined
  ) => {
    if (event != null) {
      log.setTime(
        Math.round(event.currentTarget.currentTime),
        Math.round(event.currentTarget.duration)
      );
    }
  };

  const handlerOnCloseAlert = () => {
    setShowAlert(false);
  };

  // Open Repository page
  const openRepository = () => {
    window.open(
      'https://github.com/Wpdas/digital-voyager-image-sound',
      '_blank'
    );
  };

  const icon = (
    <Icon
      icon="folder-open"
      iconSize={Icon.SIZE_LARGE * 3}
      color="rgba(167,182,194,.6)"
    />
  );
  const title = <Title>No file opened</Title>;
  const description = (
    <Description style={{ marginLeft: 24, marginRight: 24 }}>
      Open a .wav file generated by this app and decode it to
      <br />
      get the image stored on its samples or open an image file you want to
      encode as sound.
    </Description>
  );

  const noFileOpenInfo = (
    <Info>
      <NonIdealState icon={icon} title={title} description={description} />
    </Info>
  );

  const fileReadContainer = (
    <MainStage>
      <StageWrapper>
        <VisualizerCanvas
          canvasRef={visualizerCanvasRef}
          width={
            bitmapHeader != null && bitmapHeader?.width >= MIN_VISUALIZER_WIDTH
              ? bitmapHeader?.width
              : MIN_VISUALIZER_WIDTH
          }
          height={100}
        />
        <StageCanvas
          canvasRef={stageCanvasRef}
          width={bitmapHeader?.width || 0}
          height={bitmapHeader?.height || 0}
        />
      </StageWrapper>
    </MainStage>
  );

  const desktopMenu = (
    <Menu>
      <Navbar className={theme.dark}>
        <Navbar.Group align={Alignment.LEFT}>
          <AppLogo
            src={logo}
            width={34}
            alt="Go to repository page"
            onClick={openRepository}
          />
          <Navbar.Heading
            onClick={openRepository}
            style={{ cursor: 'pointer' }}
          >
            Digital Voyager Image Sound
          </Navbar.Heading>
          <Navbar.Divider />
          {!isDecoding ? (
            <>
              <Button
                className="bp3-minimal"
                icon="music"
                text="Decode Sound File"
                onClick={handlerOpenSoundFile}
              />
              <Navbar.Divider />
              <Button
                className="bp3-minimal"
                icon="media"
                text="Encode Image File"
                onClick={handlerOpenImageFile}
              />
            </>
          ) : null}
        </Navbar.Group>
        <Navbar.Group align={Alignment.RIGHT}>
          {soundFileOpen && !isDecoding ? (
            <Button
              className="bp3-minimal"
              icon="full-stacked-chart"
              text="Play and Decode"
              onClick={handlerPlayAndDecode}
            />
          ) : null}
          {soundFileOpen && !isDecoding && currentSoundFileDecoded ? (
            <Button
              className="bp3-minimal"
              icon="archive"
              text="Save Decoded File"
              onClick={handlerOnClickSaveDecodedFile}
            />
          ) : null}
        </Navbar.Group>
      </Navbar>
    </Menu>
  );

  const mobileMenuContent = (
    <Menu>
      <MenuItem
        icon="music"
        text="Decode Sound File"
        onClick={handlerOpenSoundFile}
      />
      <MenuItem
        icon="media"
        text="Encode Image File"
        onClick={handlerOpenImageFile}
      />
      {soundFileOpen && !isDecoding ? (
        <>
          <MenuDivider />
          <MenuItem
            icon="full-stacked-chart"
            text="Play and Decode"
            onClick={handlerPlayAndDecode}
          />
        </>
      ) : null}
      {soundFileOpen && !isDecoding && currentSoundFileDecoded ? (
        <MenuItem
          icon="archive"
          text="Save Decoded File"
          onClick={handlerOnClickSaveDecodedFile}
        />
      ) : null}
    </Menu>
  );

  const mobileMenu = (
    <Menu>
      <Navbar className={theme.dark}>
        <Navbar.Group align={Alignment.LEFT}>
          <AppLogo
            src={logo}
            width={34}
            alt="Go to repository page"
            onClick={openRepository}
          />
          <Navbar.Heading onClick={openRepository}>
            Digital Voyager Image Sound
          </Navbar.Heading>
        </Navbar.Group>
        <Navbar.Group align={Alignment.RIGHT}>
          <Popover content={mobileMenuContent} position={Position.BOTTOM}>
            <Button className="bp3-minimal" icon="menu" />
          </Popover>
        </Navbar.Group>
      </Navbar>
    </Menu>
  );

  const menu = isMobile ? mobileMenu : desktopMenu;

  return (
    <>
      <Alert
        className={theme.dark}
        confirmButtonText="Ok"
        isOpen={showAlert}
        onConfirm={handlerOnCloseAlert}
      >
        <p>
          Unknown file type. This is not a properly encoded audio file, however,
          you're still can decode the information.
        </p>
      </Alert>
      <Container>
        <Content>
          {menu}
          {soundFileOpen && !imageFileOpen ? fileReadContainer : null}
          {imageFileOpen && !soundFileOpen && imageFile ? (
            <EncodeImageStatus file={imageFile} />
          ) : null}
          {!imageFileOpen && !soundFileBuffer && !imageFile
            ? noFileOpenInfo
            : null}
          <FileInput
            ref={soundFileInputRef}
            accept=".wav"
            onChange={handlerOnSelectSoundFile}
          />
          <FileInput
            ref={imageFileInputRef}
            accept="image/*"
            onChange={handlerOnSelectImageFile}
          />
          <Audio audioRef={audioRef} onTimeUpdate={handlerOnTimeUpdate} />
        </Content>
        <InfoBar />
      </Container>
    </>
  );
});

export default Main;
