const InputTitle = () => {
	return (
		<div className="flex flex-col items-center justify-center gap-4">
			{/* Using Lora font italic style */}
			<h1 className="w-full text-center font-lora text-2xl sm:text-3xl md:text-4xl">
				What's your plans toady?
			</h1>
			<p className="w-full text-center text-gray-800 text-sm md:text-base">
				Import your files, and chat with agent
			</p>
		</div>
	);
};

export default InputTitle;
