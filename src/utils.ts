import { verify } from "jsonwebtoken";
import {Context} from "./context";

type Token = {
	userId: string;
}

export function getUserId(context: Context) {
	const authHeader = context.req.get("Authorization");
	const secret = process.env.APP_SECRET;

	if (!secret) throw new Error("$APP_SECRET is not defined");

	if (authHeader) {
		const token = authHeader.replace("Bearer ", "");
		const verifiedToken = verify(token, secret) as Token;
		return verifiedToken && verifiedToken.userId;
	}
}
