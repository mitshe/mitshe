"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MoreVertical,
  Plus,
  Mail,
  Shield,
  UserMinus,
  Users,
  Loader2,
  Info,
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";
import { toast } from "sonner";
import { useOrganization, useAuthContext } from "@/lib/auth";

type ClerkRole = "org:admin" | "org:member";

const roleLabels = {
  "org:admin": { label: "Admin", variant: "secondary" as const },
  "org:member": { label: "Member", variant: "outline" as const },
};

// Local mode version - simplified team page
function LocalModeTeamPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Team</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage team members and their permissions
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Team management is not available in local mode. You are running as a
          single anonymous user. To enable team features, run mitshe with Clerk
          authentication enabled.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Current User</CardTitle>
          <CardDescription>You are running in local mode</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>LU</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">Local User</p>
              <p className="text-sm text-muted-foreground">
                Anonymous local access
              </p>
            </div>
            <Badge variant="secondary" className="ml-auto">
              Admin
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Clerk mode version - full team management
function ClerkModeTeamPage() {
  const { organization, membership, memberships, invitations, isLoaded } =
    useOrganization({
      memberships: { infinite: true },
      invitations: { infinite: true },
    });

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ClerkRole>("org:member");
  const [isInviting, setIsInviting] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [isChangingRole, setIsChangingRole] = useState<string | null>(null);

  const isOwner = membership?.role === "org:admin";

  const handleInvite = async () => {
    if (!organization || !("inviteMember" in organization)) return;

    setIsInviting(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (organization as any).inviteMember({
        emailAddress: inviteEmail,
        role: inviteRole,
      });
      toast.success(`Invitation sent to ${inviteEmail}`);
      setIsInviteOpen(false);
      setInviteEmail("");
      setInviteRole("org:member");
      if (invitations?.revalidate) {
        await invitations.revalidate();
      }
    } catch {
      toast.error("Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (membershipId: string) => {
    if (!organization || !("removeMember" in organization)) return;

    setIsRemoving(membershipId);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (organization as any).removeMember(membershipId);
      toast.success("Member removed successfully");
      if (memberships?.revalidate) {
        await memberships.revalidate();
      }
    } catch {
      toast.error("Failed to remove member");
    } finally {
      setIsRemoving(null);
    }
  };

  const handleChangeRole = async (
    membershipId: string,
    userId: string,
    newRole: ClerkRole
  ) => {
    if (!organization || !("updateMember" in organization)) return;

    setIsChangingRole(membershipId);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (organization as any).updateMember({ userId, role: newRole });
      toast.success("Role updated successfully");
      if (memberships?.revalidate) {
        await memberships.revalidate();
      }
    } catch {
      toast.error("Failed to update role");
    } finally {
      setIsChangingRole(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const membersList = memberships?.data || [];
  const pendingInvitations = invitations?.data || [];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Team</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage team members and their permissions
          </p>
        </div>
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="sm:h-10">
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Invite Member</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to join your organization
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={isInviting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={inviteRole}
                  onValueChange={(v: ClerkRole) => setInviteRole(v)}
                  disabled={isInviting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="org:admin">Admin</SelectItem>
                    <SelectItem value="org:member">Member</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Admins can manage team members and settings
                </p>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsInviteOpen(false)}
                disabled={isInviting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleInvite}
                disabled={!inviteEmail || isInviting}
              >
                {isInviting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                Send Invitation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4" />
          <span>Members</span>
          <span className="font-semibold text-foreground">
            {membersList.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Shield className="h-4 w-4" />
          <span>Admins</span>
          <span className="font-semibold text-foreground">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {membersList.filter((m: any) => m.role === "org:admin").length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Mail className="h-4 w-4" />
          <span>Pending</span>
          <span className="font-semibold text-foreground">
            {pendingInvitations.length}
          </span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            People who have access to this organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {membersList.map((member: any) => {
                const user = member.publicUserData;
                const name =
                  user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user?.identifier || "Unknown";
                const email = user?.identifier || "";
                const role = member.role as ClerkRole;
                const isCurrentUser = member.id === membership?.id;

                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user?.imageUrl} />
                          <AvatarFallback>{getInitials(name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {name}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                (you)
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleLabels[role]?.variant || "outline"}>
                        {roleLabels[role]?.label || role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {member.createdAt
                        ? formatDistanceToNow(new Date(member.createdAt))
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {isOwner && !isCurrentUser && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={
                                isRemoving === member.id ||
                                isChangingRole === member.id
                              }
                            >
                              {isRemoving === member.id ||
                              isChangingRole === member.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <MoreVertical className="w-4 h-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                handleChangeRole(
                                  member.id,
                                  user?.userId || "",
                                  role === "org:admin"
                                    ? "org:member"
                                    : "org:admin"
                                )
                              }
                            >
                              <Shield className="w-4 h-4 mr-2" />
                              {role === "org:admin"
                                ? "Remove Admin"
                                : "Make Admin"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() =>
                                handleRemoveMember(user?.userId || "")
                              }
                            >
                              <UserMinus className="w-4 h-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TeamPage() {
  return <ClerkModeTeamPage />;
}
