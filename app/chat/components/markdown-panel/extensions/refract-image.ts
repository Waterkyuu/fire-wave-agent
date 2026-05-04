import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import ImageNodeView from "../block-nodeviews/image-nodeview";

const RefractImage = Image.extend({
	addNodeView() {
		return ReactNodeViewRenderer(ImageNodeView);
	},
});

export default RefractImage;
