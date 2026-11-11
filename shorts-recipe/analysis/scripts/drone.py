import sys,glob,os,numpy as np,soundfile as sf,librosa
for f in sorted(glob.glob(os.path.join(sys.argv[1],"*.wav"))):
    y,sr=sf.read(f,dtype="float32")
    S=np.abs(librosa.stft(y,n_fft=8192,hop_length=2048))
    fr=librosa.fft_frequencies(sr=sr,n_fft=8192)
    floor=20*np.log10(np.percentile(S,20,axis=1)+1e-9)
    band=(fr>60)&(fr<2000)
    fl=floor[band]; fb=fr[band]
    smooth=np.convolve(fl,np.ones(41)/41,mode="same")
    prom=fl-smooth; i=np.argmax(prom)
    # how many frames contain that peak at > -40dB rel max
    print(f"{os.path.basename(f)[:-4]:14s} sustained-tone peak {fb[i]:6.0f} Hz  prominence {prom[i]:5.1f} dB", librosa.hz_to_note(fb[i]))
