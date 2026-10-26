import mongoose from "mongoose";

const friendRequestSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      maxlength: 300,
      trim: true,
    },
    pairKey: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

friendRequestSchema.pre("validate", function () {
  if (this.from && this.to) {
    this.pairKey = [this.from.toString(), this.to.toString()].sort().join(":");
  }
});

// Legacy requests have no pairKey; existing two-way lookups still find them.
friendRequestSchema.index(
  { pairKey: 1 },
  {
    name: "unique_pending_friend_pair",
    unique: true,
    partialFilterExpression: { pairKey: { $type: "string" } },
  }
);

friendRequestSchema.index({ from: 1, to: 1 }, { unique: true });

friendRequestSchema.index({ from: 1 });

friendRequestSchema.index({ to: 1 });

const FriendRequest = mongoose.model("FriendRequest", friendRequestSchema);
export default FriendRequest;
