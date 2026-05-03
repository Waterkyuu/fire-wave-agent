import CodeBlock from "@tiptap/extension-code-block";
import { ReactNodeViewRenderer } from "@tiptap/react";
import CodeBlockNodeView from "../block-nodeviews/code-block-nodeview";

const RefractCodeBlock = CodeBlock.extend({
	addNodeView() {
		return ReactNodeViewRenderer(CodeBlockNodeView);
	},
});

export default RefractCodeBlock;
